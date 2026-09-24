import logging
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from app.models.user import User, Profile
from app.models.problem import Problem, Topic, ProblemTag
from app.models.submission import Submission
from app.models.learning import (
    UserTopicProgress, BugPattern, CodeVersion, DailyChallenge,
    LearningJournal, Achievement, UserAchievement
)

logger = logging.getLogger(__name__)

class LearningService:
    
    async def get_skill_graph_data(self, user_id: UUID, db: AsyncSession) -> dict:
        """Get skill graph data for visualization."""
        # Get all topics
        topics_result = await db.execute(select(Topic).order_by(Topic.display_order))
        topics = topics_result.scalars().all()
        
        # Get user's progress per topic
        progress_result = await db.execute(
            select(UserTopicProgress).where(UserTopicProgress.user_id == user_id)
        )
        progress_map = {str(p.topic_id): p for p in progress_result.scalars().all()}
        
        nodes = []
        for topic in topics:
            prog = progress_map.get(str(topic.id))
            nodes.append({
                'id': str(topic.id),
                'name': topic.name,
                'slug': topic.slug,
                'icon': topic.icon,
                'problem_count': topic.problem_count,
                'problems_solved': prog.problems_solved if prog else 0,
                'problems_attempted': prog.problems_attempted if prog else 0,
                'accuracy': prog.accuracy if prog else 0.0,
                'confidence': prog.confidence if prog else 0.0,
                'last_practiced': prog.last_practiced.isoformat() if prog and prog.last_practiced else None,
                'status': self._get_topic_status(prog),
            })
        
        # Define topic relationships (edges) for the graph
        edges = self._get_topic_edges()
        
        return {'nodes': nodes, 'edges': edges}
    
    def _get_topic_status(self, progress) -> str:
        if not progress or progress.problems_solved == 0:
            return 'not_started'
        if progress.confidence >= 80:
            return 'mastered'
        if progress.confidence >= 50:
            return 'proficient'
        if progress.problems_solved > 0:
            return 'learning'
        return 'not_started'
    
    def _get_topic_edges(self) -> list[dict]:
        """Define prerequisite relationships between topics."""
        return [
            {'from': 'arrays', 'to': 'two-pointers'},
            {'from': 'arrays', 'to': 'sliding-window'},
            {'from': 'arrays', 'to': 'sorting'},
            {'from': 'arrays', 'to': 'hashing'},
            {'from': 'hashing', 'to': 'strings'},
            {'from': 'sorting', 'to': 'binary-search'},
            {'from': 'arrays', 'to': 'linked-lists'},
            {'from': 'linked-lists', 'to': 'stacks'},
            {'from': 'stacks', 'to': 'queues'},
            {'from': 'stacks', 'to': 'monotonic-stack'},
            {'from': 'binary-search', 'to': 'trees'},
            {'from': 'trees', 'to': 'binary-search-trees'},
            {'from': 'trees', 'to': 'heaps'},
            {'from': 'trees', 'to': 'tries'},
            {'from': 'heaps', 'to': 'greedy'},
            {'from': 'trees', 'to': 'graphs'},
            {'from': 'graphs', 'to': 'backtracking'},
            {'from': 'graphs', 'to': 'dynamic-programming'},
            {'from': 'dynamic-programming', 'to': 'advanced-dp'},
        ]
    
    async def get_personalized_roadmap(self, user_id: UUID, db: AsyncSession) -> dict:
        """Generate personalized learning roadmap based on current progress."""
        # Get user profile
        profile_result = await db.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()
        
        skill_graph = await self.get_skill_graph_data(user_id, db)
        nodes = skill_graph['nodes']
        edges = skill_graph['edges']
        
        # Build prerequisite map
        prereq_map = {}  # topic_slug -> list of prerequisite slugs
        for edge in edges:
            prereq_map.setdefault(edge['to'], []).append(edge['from'])
        
        # Categorize topics
        completed = [n for n in nodes if n['status'] == 'mastered']
        in_progress = [n for n in nodes if n['status'] in ('learning', 'proficient')]
        not_started = [n for n in nodes if n['status'] == 'not_started']
        
        # Find recommended next topics (prerequisites met)
        recommended = []
        completed_slugs = {n['slug'] for n in completed}
        in_progress_slugs = {n['slug'] for n in in_progress}
        
        for node in not_started:
            prereqs = prereq_map.get(node['slug'], [])
            if not prereqs or all(p in completed_slugs or p in in_progress_slugs for p in prereqs):
                recommended.append(node)
        
        # Sort by display order
        stages = []
        
        if in_progress:
            stages.append({
                'name': 'Continue Learning',
                'description': 'Topics you\'ve started — keep going!',
                'topics': in_progress[:3],
                'status': 'active',
            })
        
        if recommended:
            stages.append({
                'name': 'Up Next',
                'description': 'Recommended topics based on your progress',
                'topics': recommended[:3],
                'status': 'upcoming',
            })
        
        remaining = [n for n in not_started if n not in recommended]
        if remaining:
            stages.append({
                'name': 'Future Topics',
                'description': 'Complete prerequisites to unlock',
                'topics': remaining[:4],
                'status': 'locked',
            })
        
        if completed:
            stages.append({
                'name': 'Mastered',
                'description': 'Topics you\'ve conquered',
                'topics': completed,
                'status': 'completed',
            })
        
        overall_progress = len(completed) / max(len(nodes), 1) * 100
        
        return {
            'stages': stages,
            'overall_progress': round(overall_progress, 1),
            'total_topics': len(nodes),
            'completed_topics': len(completed),
            'skill_level': profile.skill_level if profile else 'beginner',
        }
    
    async def get_adaptive_problem(self, user_id: UUID, topic_slug: str, db: AsyncSession) -> Optional[dict]:
        """Get next recommended problem based on adaptive difficulty."""
        # Get topic
        topic_result = await db.execute(select(Topic).where(Topic.slug == topic_slug))
        topic = topic_result.scalar_one_or_none()
        if not topic:
            return None
        
        # Get user's progress on this topic
        progress_result = await db.execute(
            select(UserTopicProgress).where(
                and_(UserTopicProgress.user_id == user_id, UserTopicProgress.topic_id == topic.id)
            )
        )
        progress = progress_result.scalar_one_or_none()
        
        # Determine target difficulty based on accuracy
        if not progress or progress.accuracy >= 80:
            target_difficulty = 'medium' if progress and progress.problems_solved > 3 else 'easy'
        elif progress.accuracy >= 50:
            target_difficulty = 'medium'
        else:
            target_difficulty = 'easy'  # Struggling, give easier problems
        
        # Get solved problem IDs
        solved_result = await db.execute(
            select(Submission.problem_id).where(
                and_(Submission.user_id == user_id, Submission.status == 'accepted')
            ).distinct()
        )
        solved_ids = {row[0] for row in solved_result.all()}
        
        # Find an unsolved problem in this topic with target difficulty
        problem_result = await db.execute(
            select(Problem)
            .join(ProblemTag, ProblemTag.problem_id == Problem.id)
            .where(
                and_(
                    ProblemTag.topic_id == topic.id,
                    Problem.difficulty == target_difficulty,
                    Problem.is_active == True,
                    ~Problem.id.in_(solved_ids) if solved_ids else True,
                )
            )
            .limit(1)
        )
        problem = problem_result.scalar_one_or_none()
        
        if not problem:
            # Fallback: any unsolved problem in this topic
            problem_result = await db.execute(
                select(Problem)
                .join(ProblemTag, ProblemTag.problem_id == Problem.id)
                .where(
                    and_(
                        ProblemTag.topic_id == topic.id,
                        Problem.is_active == True,
                        ~Problem.id.in_(solved_ids) if solved_ids else True,
                    )
                )
                .limit(1)
            )
            problem = problem_result.scalar_one_or_none()
        
        if not problem:
            return None
        
        return {
            'id': str(problem.id),
            'title': problem.title,
            'slug': problem.slug,
            'difficulty': problem.difficulty,
            'recommended_reason': f'Based on your {progress.accuracy:.0f}% accuracy' if progress else 'Start learning this topic',
            'target_difficulty': target_difficulty,
        }
    
    async def get_bug_patterns(self, user_id: UUID, db: AsyncSession) -> list[dict]:
        """Get user's Bug DNA — recurring bug patterns."""
        result = await db.execute(
            select(BugPattern)
            .where(BugPattern.user_id == user_id)
            .order_by(desc(BugPattern.occurrences))
        )
        patterns = result.scalars().all()
        
        return [{
            'id': str(p.id),
            'bug_type': p.bug_type,
            'occurrences': p.occurrences,
            'last_occurred': p.last_occurred.isoformat() if p.last_occurred else None,
            'description': p.description,
            'category': self._categorize_bug(p.bug_type),
        } for p in patterns]
    
    def _categorize_bug(self, bug_type: str) -> str:
        logic_bugs = ['off_by_one', 'wrong_loop_condition', 'wrong_comparison', 'infinite_loop']
        memory_bugs = ['null_pointer', 'index_out_of_bounds', 'memory_leak', 'uninitialized_variable']
        syntax_bugs = ['missing_semicolon', 'wrong_syntax', 'type_mismatch']
        if bug_type in logic_bugs:
            return 'Logic'
        if bug_type in memory_bugs:
            return 'Memory/Pointer'
        if bug_type in syntax_bugs:
            return 'Syntax'
        return 'Other'
    
    async def get_code_versions(self, user_id: UUID, problem_id: str, db: AsyncSession) -> list[dict]:
        """Get code version history for a problem (Code Time Machine)."""
        result = await db.execute(
            select(CodeVersion)
            .where(and_(CodeVersion.user_id == user_id, CodeVersion.problem_id == problem_id))
            .order_by(desc(CodeVersion.version_number))
        )
        versions = result.scalars().all()
        
        return [{
            'id': str(v.id),
            'version_number': v.version_number,
            'code': v.code,
            'language': v.language,
            'change_description': v.change_description,
            'time_complexity': v.time_complexity,
            'space_complexity': v.space_complexity,
            'test_results_snapshot': v.test_results_snapshot,
            'created_at': v.created_at.isoformat() if v.created_at else None,
        } for v in versions]
    
    async def save_code_version(self, user_id: UUID, problem_id: str, code: str, language: str, description: str, db: AsyncSession) -> dict:
        """Save a code version snapshot."""
        # Get next version number
        result = await db.execute(
            select(func.max(CodeVersion.version_number))
            .where(and_(CodeVersion.user_id == user_id, CodeVersion.problem_id == problem_id))
        )
        max_version = result.scalar() or 0
        
        version = CodeVersion(
            user_id=user_id,
            problem_id=problem_id,
            code=code,
            language=language,
            version_number=max_version + 1,
            change_description=description,
        )
        db.add(version)
        await db.commit()
        await db.refresh(version)
        
        return {'id': str(version.id), 'version_number': version.version_number}
    
    async def get_daily_challenge(self, db: AsyncSession) -> Optional[dict]:
        """Get today's daily challenge."""
        today = date.today()
        result = await db.execute(
            select(DailyChallenge)
            .where(DailyChallenge.challenge_date == today)
        )
        challenge = result.scalar_one_or_none()
        
        if not challenge:
            # Auto-pick a problem as daily challenge
            problem_result = await db.execute(
                select(Problem)
                .where(Problem.is_active == True)
                .order_by(func.random())
                .limit(1)
            )
            problem = problem_result.scalar_one_or_none()
            if problem:
                challenge = DailyChallenge(
                    problem_id=problem.id,
                    challenge_date=today,
                    difficulty=problem.difficulty,
                )
                db.add(challenge)
                await db.commit()
                await db.refresh(challenge)
            else:
                return None
        
        # Get the problem details
        problem_result = await db.execute(select(Problem).where(Problem.id == challenge.problem_id))
        problem = problem_result.scalar_one_or_none()
        
        if not problem:
            return None
        
        return {
            'id': str(challenge.id),
            'challenge_date': today.isoformat(),
            'difficulty': challenge.difficulty,
            'problem': {
                'id': str(problem.id),
                'title': problem.title,
                'slug': problem.slug,
                'difficulty': problem.difficulty,
            }
        }
    
    async def get_journal_entries(self, user_id: UUID, db: AsyncSession, limit: int = 30) -> list[dict]:
        """Get learning journal entries."""
        result = await db.execute(
            select(LearningJournal)
            .where(LearningJournal.user_id == user_id)
            .order_by(desc(LearningJournal.entry_date))
            .limit(limit)
        )
        entries = result.scalars().all()
        
        return [{
            'id': str(e.id),
            'entry_date': e.entry_date.isoformat(),
            'topics_practiced': e.topics_practiced or [],
            'problems_solved_ids': [str(pid) for pid in (e.problems_solved_ids or [])],
            'mistakes_made': e.mistakes_made or {},
            'improvements': e.improvements or {},
            'auto_summary': e.auto_summary,
            'user_notes': e.user_notes,
            'created_at': e.created_at.isoformat() if e.created_at else None,
        } for e in entries]
    
    async def save_journal_note(self, user_id: UUID, entry_date: date, notes: str, db: AsyncSession) -> dict:
        """Save or update user notes for a journal entry."""
        result = await db.execute(
            select(LearningJournal)
            .where(and_(LearningJournal.user_id == user_id, LearningJournal.entry_date == entry_date))
        )
        entry = result.scalar_one_or_none()
        
        if entry:
            entry.user_notes = notes
        else:
            entry = LearningJournal(
                user_id=user_id,
                entry_date=entry_date,
                user_notes=notes,
            )
            db.add(entry)
        
        await db.commit()
        return {'status': 'saved'}
    
    async def check_achievements(self, user_id: UUID, db: AsyncSession) -> list[dict]:
        """Check and award new achievements."""
        # Get user profile
        profile_result = await db.execute(select(Profile).where(Profile.user_id == user_id))
        profile = profile_result.scalar_one_or_none()
        if not profile:
            return []
        
        # Get all achievements
        achiev_result = await db.execute(select(Achievement))
        all_achievements = achiev_result.scalars().all()
        
        # Get already earned
        earned_result = await db.execute(
            select(UserAchievement.achievement_id).where(UserAchievement.user_id == user_id)
        )
        earned_ids = {row[0] for row in earned_result.all()}
        
        newly_earned = []
        for achievement in all_achievements:
            if achievement.id in earned_ids:
                continue
            
            # Check if requirement is met
            earned = False
            if achievement.category == 'problems_solved' and profile.problems_solved >= (achievement.requirement_count or 0):
                earned = True
            elif achievement.category == 'streak' and profile.current_streak >= (achievement.requirement_count or 0):
                earned = True
            elif achievement.category == 'accuracy' and profile.accuracy_percentage >= (achievement.requirement_count or 0):
                earned = True
            
            if earned:
                ua = UserAchievement(user_id=user_id, achievement_id=achievement.id)
                db.add(ua)
                newly_earned.append({
                    'id': str(achievement.id),
                    'name': achievement.name,
                    'description': achievement.description,
                    'icon': achievement.icon,
                    'points': achievement.points,
                })
        
        if newly_earned:
            await db.commit()
        
        return newly_earned


learning_service = LearningService()
