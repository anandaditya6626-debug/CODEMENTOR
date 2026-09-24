import json
import logging
from abc import ABC, abstractmethod
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class AIProvider(ABC):
    """Abstract base class for AI providers."""
    
    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        pass


class OpenAIProvider(AIProvider):
    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    'https://api.openai.com/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {settings.OPENAI_API_KEY}',
                        'Content-Type': 'application/json',
                    },
                    json={
                        'model': getattr(settings, 'OPENAI_MODEL', 'gpt-4o'),
                        'messages': [
                            {'role': 'system', 'content': system_prompt},
                            {'role': 'user', 'content': user_prompt},
                        ],
                        'temperature': temperature,
                        'max_tokens': max_tokens,
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data['choices'][0]['message']['content']
        except Exception as e:
            logger.error(f'OpenAI error: {e}')
            raise AIServiceError(f'AI request failed: {str(e)}')


class GeminiProvider(AIProvider):
    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        try:
            import httpx
            model = getattr(settings, 'GEMINI_MODEL', 'gemini-1.5-pro')
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}',
                    json={
                        'system_instruction': {'parts': [{'text': system_prompt}]},
                        'contents': [{'parts': [{'text': user_prompt}]}],
                        'generationConfig': {
                            'temperature': temperature,
                            'maxOutputTokens': max_tokens,
                        }
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data['candidates'][0]['content']['parts'][0]['text']
        except Exception as e:
            logger.error(f'Gemini error: {e}')
            raise AIServiceError(f'AI request failed: {str(e)}')


class AnthropicProvider(AIProvider):
    async def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    'https://api.anthropic.com/v1/messages',
                    headers={
                        'x-api-key': settings.ANTHROPIC_API_KEY,
                        'content-type': 'application/json',
                        'anthropic-version': '2023-06-01',
                    },
                    json={
                        'model': getattr(settings, 'ANTHROPIC_MODEL', 'claude-sonnet-4-20250514'),
                        'max_tokens': max_tokens,
                        'system': system_prompt,
                        'messages': [{'role': 'user', 'content': user_prompt}],
                        'temperature': temperature,
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data['content'][0]['text']
        except Exception as e:
            logger.error(f'Anthropic error: {e}')
            raise AIServiceError(f'AI request failed: {str(e)}')


class AIServiceError(Exception):
    pass


class AIService:
    """Main AI service with provider-independent methods."""
    
    def __init__(self):
        self.provider = self._get_provider()
    
    def _get_provider(self) -> Optional[AIProvider]:
        provider_name = getattr(settings, 'AI_PROVIDER', '').lower()
        try:
            if provider_name == 'openai' and getattr(settings, 'OPENAI_API_KEY', ''):
                return OpenAIProvider()
            elif provider_name == 'gemini' and getattr(settings, 'GEMINI_API_KEY', ''):
                return GeminiProvider()
            elif provider_name == 'anthropic' and getattr(settings, 'ANTHROPIC_API_KEY', ''):
                return AnthropicProvider()
        except Exception:
            pass
        logger.warning('No AI provider configured. AI features will be unavailable.')
        return None
    
    @property
    def is_available(self) -> bool:
        return self.provider is not None
    
    async def generate_hint(self, problem_title: str, problem_description: str, code: str, language: str, hint_level: int, previous_hints: list[str] = []) -> dict:
        """Generate progressive hints (Level 1-5)."""
        
        level_instructions = {
            1: 'Give a very brief NUDGE - just a small conceptual direction without revealing the approach. One sentence max. Like a mentor gently pointing the student in the right direction.',
            2: 'Give a HINT - more specific guidance about what data structure or technique to consider, but do NOT reveal the algorithm. 2-3 sentences.',
            3: 'Explain the APPROACH - describe the algorithm/strategy to solve this problem step by step, but do NOT write any code. Use plain English.',
            4: 'Provide PSEUDOCODE - write clear pseudocode that outlines the solution logic. Do NOT write actual code in any programming language.',
            5: 'Provide the COMPLETE SOLUTION with explanation. Write working code in the specified language and explain each step.',
        }
        
        system_prompt = f"""You are CodeMentor, a patient and encouraging AI coding mentor. 
You are helping a student solve a coding problem.
Your goal is to teach them HOW TO THINK, not just give answers.

Current hint level: {hint_level}/5
Instruction: {level_instructions.get(hint_level, level_instructions[1])}

{'Previous hints given: ' + chr(10).join(f'- {h}' for h in previous_hints) if previous_hints else ''}

IMPORTANT: Do NOT repeat information from previous hints. Build upon them.
Respond in markdown format."""
        
        user_prompt = f"""Problem: {problem_title}

{problem_description}

Student's current code ({language}):
```{language}
{code}
```

Please provide a Level {hint_level} hint."""
        
        if not self.is_available:
            return self._fallback_hint(hint_level)
        
        response = await self.provider.generate(system_prompt, user_prompt, temperature=0.7)
        return {'hint': response, 'level': hint_level, 'type': 'ai_generated'}
    
    async def explain_code(self, code: str, language: str, problem_context: str = '', mode: str = 'beginner') -> dict:
        """Explain code at different levels: beginner, intermediate, interview."""
        
        mode_instructions = {
            'beginner': 'Explain as if teaching a beginner. Use simple language, avoid jargon, explain every concept. Use analogies where helpful.',
            'intermediate': 'Explain for someone who knows basics but wants to understand the logic and patterns. Focus on WHY decisions were made.',
            'interview': 'Explain as if in a technical interview. Cover: approach reasoning, time/space complexity, trade-offs, edge cases, and potential follow-up optimizations.',
        }
        
        system_prompt = f"""You are CodeMentor, an expert code explainer.
{mode_instructions.get(mode, mode_instructions['beginner'])}

Structure your explanation:
1. **What the code does** - High-level purpose
2. **Step by step** - Walk through the major steps
3. **Key variables** - What each important variable represents
4. **Time complexity** - Big-O analysis with explanation
5. **Space complexity** - Big-O analysis with explanation
6. **Potential issues** - Any bugs, edge cases, or improvements

Use markdown formatting. Be encouraging and educational."""
        
        user_prompt = f"""{'Problem context: ' + problem_context + chr(10) if problem_context else ''}Code ({language}):
```{language}
{code}
```

Please explain this code in {mode} mode."""
        
        if not self.is_available:
            return self._fallback_explain()
        
        response = await self.provider.generate(system_prompt, user_prompt, temperature=0.3)
        return {'explanation': response, 'mode': mode, 'type': 'ai_generated'}
    
    async def debug_code(self, code: str, language: str, error_output: str, problem_context: str = '') -> dict:
        """Debug code with root cause analysis."""
        
        system_prompt = """You are CodeMentor, an expert debugger. A student's code has an error.

Do NOT simply rewrite the entire program. Instead:
1. **What went wrong** - Identify the specific error
2. **Where it happened** - Point to the exact location
3. **Why it happened** - Explain the root cause
4. **How to think about fixing it** - Guide the student's reasoning
5. **Suggested fix** - Show the minimal change needed (not a full rewrite)

Be educational. Help them understand the bug pattern so they don't repeat it.
Use markdown formatting."""
        
        user_prompt = f"""{'Problem context: ' + problem_context + chr(10) if problem_context else ''}Code ({language}):
```{language}
{code}
```

Error output:
```
{error_output}
```

Please debug this code."""
        
        if not self.is_available:
            return self._fallback_debug()
        
        response = await self.provider.generate(system_prompt, user_prompt, temperature=0.3)
        return {'analysis': response, 'type': 'ai_generated'}
    
    async def analyze_complexity(self, code: str, language: str) -> dict:
        """Analyze time and space complexity."""
        
        system_prompt = """You are CodeMentor's complexity analyzer. Analyze the given code's complexity.

Provide:
1. **Time Complexity**: Big-O notation with clear explanation of WHY
2. **Space Complexity**: Big-O notation with clear explanation
3. **Confidence**: How confident you are (high/medium/low)
4. **Optimization hints**: Can this be improved? How?

IMPORTANT: If you're uncertain, explicitly state it. Never pretend AI analysis is mathematically guaranteed.
Respond in JSON format:
{"time_complexity": "O(n)", "time_explanation": "...", "space_complexity": "O(1)", "space_explanation": "...", "confidence": "high", "can_optimize": true, "optimization_hint": "..."}"""
        
        user_prompt = f"""Analyze this code's complexity:
```{language}
{code}
```"""
        
        if not self.is_available:
            return self._fallback_complexity()
        
        response = await self.provider.generate(system_prompt, user_prompt, temperature=0.2)
        try:
            # Try to parse JSON response
            cleaned = response.strip()
            if cleaned.startswith('```'):
                cleaned = cleaned.split('\n', 1)[1].rsplit('```', 1)[0]
            return {**json.loads(cleaned), 'type': 'ai_generated'}
        except (json.JSONDecodeError, IndexError):
            return {'analysis': response, 'type': 'ai_generated'}
    
    async def detect_edge_cases(self, code: str, language: str, problem_description: str) -> dict:
        """Detect potential edge cases the code might miss."""
        
        system_prompt = """You are CodeMentor's Edge Case Radar. Analyze the problem and student's code for likely edge cases.

For each edge case, determine if the student's code handles it.

Respond in JSON format:
{"edge_cases": [{"name": "Empty input", "description": "What happens with empty array", "handled": false, "severity": "high"}, ...]}

Common edge cases to check:
- Empty input
- Single element
- Duplicate values
- Negative numbers
- Maximum/minimum constraints
- Already sorted input
- Integer overflow
- Null/undefined values
- All same elements
- Boundary values"""
        
        user_prompt = f"""Problem:
{problem_description}

Code ({language}):
```{language}
{code}
```

Detect potential edge cases."""
        
        if not self.is_available:
            return self._fallback_edge_cases()
        
        response = await self.provider.generate(system_prompt, user_prompt, temperature=0.3)
        try:
            cleaned = response.strip()
            if cleaned.startswith('```'):
                cleaned = cleaned.split('\n', 1)[1].rsplit('```', 1)[0]
            return {**json.loads(cleaned), 'type': 'ai_generated'}
        except (json.JSONDecodeError, IndexError):
            return {'analysis': response, 'type': 'ai_generated'}
    
    async def review_code(self, code: str, language: str, problem_context: str = '') -> dict:
        """Code quality analysis — CodeMentor Analysis."""
        
        system_prompt = """You are CodeMentor's code reviewer. Provide a quality analysis of the student's code.

Rate each dimension from 0-100 and explain WHY:
1. **Readability** - Variable naming, code structure, comments
2. **Efficiency** - Algorithm choice, unnecessary operations
3. **Structure** - Code organization, modularity, patterns
4. **Edge Cases** - How well edge cases are handled

IMPORTANT: These are CodeMentor Analysis scores, not objective industry-standard scores.
Explain exactly why each metric received its value.

Respond in JSON format:
{"readability": {"score": 85, "explanation": "..."}, "efficiency": {"score": 70, "explanation": "..."}, "structure": {"score": 90, "explanation": "..."}, "edge_cases": {"score": 60, "explanation": "..."}, "overall": 76, "summary": "...", "suggestions": ["..."]}"""
        
        user_prompt = f"""{'Problem: ' + problem_context + chr(10) if problem_context else ''}Code ({language}):
```{language}
{code}
```

Please review this code."""
        
        if not self.is_available:
            return self._fallback_review()
        
        response = await self.provider.generate(system_prompt, user_prompt, temperature=0.3)
        try:
            cleaned = response.strip()
            if cleaned.startswith('```'):
                cleaned = cleaned.split('\n', 1)[1].rsplit('```', 1)[0]
            return {**json.loads(cleaned), 'type': 'ai_generated'}
        except (json.JSONDecodeError, IndexError):
            return {'analysis': response, 'type': 'ai_generated'}
    
    # Fallback responses when AI is not configured
    def _fallback_hint(self, level: int) -> dict:
        return {'hint': 'AI mentor is not configured. Please set up an AI provider (OpenAI, Gemini, or Anthropic) in your .env file to enable AI-powered hints.', 'level': level, 'type': 'fallback'}
    
    def _fallback_explain(self) -> dict:
        return {'explanation': 'AI explanation is not available. Please configure an AI provider in your .env file.', 'mode': 'unavailable', 'type': 'fallback'}
    
    def _fallback_debug(self) -> dict:
        return {'analysis': 'AI debugger is not available. Check your error output carefully and review your logic step by step.', 'type': 'fallback'}
    
    def _fallback_complexity(self) -> dict:
        return {'time_complexity': 'N/A', 'space_complexity': 'N/A', 'time_explanation': 'AI analyzer not configured.', 'space_explanation': 'Configure an AI provider to enable analysis.', 'confidence': 'none', 'type': 'fallback'}
    
    def _fallback_edge_cases(self) -> dict:
        return {'edge_cases': [{'name': 'AI not configured', 'description': 'Configure an AI provider to detect edge cases automatically.', 'handled': False, 'severity': 'info'}], 'type': 'fallback'}
    
    def _fallback_review(self) -> dict:
        return {'readability': {'score': 0, 'explanation': 'AI not configured'}, 'efficiency': {'score': 0, 'explanation': 'AI not configured'}, 'structure': {'score': 0, 'explanation': 'AI not configured'}, 'edge_cases': {'score': 0, 'explanation': 'AI not configured'}, 'overall': 0, 'summary': 'Configure an AI provider to enable code review.', 'type': 'fallback'}


# Singleton instance
ai_service = AIService()
