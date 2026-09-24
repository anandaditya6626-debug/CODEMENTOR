from datetime import datetime, timezone
import uuid
import json
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.social import Contest, ContestParticipation, InterviewSession
from app.models.user import User, Profile
from app.models.problem import Problem
from app.services.ai_service import ai_service


async def get_leaderboard(db: AsyncSession, timeframe: str = 'all_time', limit: int = 50):
    # Base query combining Profile and User
    query = (
        select(
            User.username,
            User.avatar_url,
            Profile.problems_solved,
            Profile.accuracy_percentage.label('accuracy'),
            Profile.current_streak.label('streak'),
            (Profile.problems_solved * 10 + Profile.current_streak * 5 + Profile.accuracy_percentage * 2).label('score')
        )
        .join(User, Profile.user_id == User.id)
    )
    
    # We could implement timeframe filtering here based on a recent activity table, 
    # but for now we'll just use the overall profile stats as requested
    
    query = query.order_by(desc('score')).limit(limit)
    result = await db.execute(query)
    
    leaderboard = []
    for i, row in enumerate(result.all()):
        leaderboard.append({
            "rank": i + 1,
            "username": row.username,
            "avatar_url": row.avatar_url,
            "problems_solved": row.problems_solved,
            "accuracy": float(row.accuracy) if row.accuracy else 0.0,
            "streak": row.streak,
            "score": float(row.score) if row.score else 0.0
        })
        
    return leaderboard

async def get_contests(db: AsyncSession, status: str = 'upcoming'):
    now = datetime.now(timezone.utc)
    query = select(Contest)
    
    if status == 'upcoming':
        query = query.where(Contest.start_time > now)
    elif status == 'active':
        query = query.where(Contest.start_time <= now, Contest.end_time >= now)
    elif status == 'past':
        query = query.where(Contest.end_time < now)
        
    query = query.order_by(Contest.start_time)
    result = await db.execute(query)
    return result.scalars().all()

async def get_contest_leaderboard(contest_id: uuid.UUID, db: AsyncSession):
    query = (
        select(ContestParticipation, User.username, User.avatar_url)
        .join(User, ContestParticipation.user_id == User.id)
        .where(ContestParticipation.contest_id == contest_id)
        .order_by(desc(ContestParticipation.score), ContestParticipation.total_time_seconds)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    leaderboard = []
    for i, row in enumerate(rows):
        participation, username, avatar_url = row
        leaderboard.append({
            "rank": i + 1,
            "username": username,
            "avatar_url": avatar_url,
            "score": participation.score,
            "problems_solved": participation.problems_solved,
            "total_time_seconds": participation.total_time_seconds
        })
    return leaderboard

async def join_contest(user_id: uuid.UUID, contest_id: uuid.UUID, db: AsyncSession):
    participation = ContestParticipation(
        contest_id=contest_id,
        user_id=user_id,
        score=0,
        problems_solved=0,
        total_time_seconds=0
    )
    db.add(participation)
    await db.commit()
    await db.refresh(participation)
    return participation

async def start_interview(user_id: uuid.UUID, session_type: str, difficulty: str, company_style: str, db: AsyncSession):
    # Find a random problem matching difficulty
    problem_query = select(Problem).where(Problem.difficulty == difficulty).order_by(func.random()).limit(1)
    result = await db.execute(problem_query)
    problem = result.scalar_one_or_none()
    
    problem_id = problem.id if problem else None
    
    session = InterviewSession(
        user_id=user_id,
        session_type=session_type,
        difficulty=difficulty,
        company_style=company_style,
        problem_id=problem_id,
        status='in_progress',
        conversation=[]
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # Generate initial AI message
    system_prompt = f"You are a senior software engineer conducting a technical interview at {company_style}. Ask follow-up questions, probe the candidate's understanding, and evaluate their approach. Be professional but friendly."
    initial_prompt = f"Start a {session_type} interview for a {difficulty} level position. "
    if problem:
        initial_prompt += f"Present this problem to the candidate: {problem.title}\n{problem.description}"
    
    ai_response = await ai_service.generate(prompt=initial_prompt, system_prompt=system_prompt)
    
    # Update conversation
    conversation = [
        {"role": "system", "content": system_prompt, "timestamp": datetime.now(timezone.utc).isoformat()},
        {"role": "assistant", "content": ai_response, "timestamp": datetime.now(timezone.utc).isoformat()}
    ]
    
    session.conversation = conversation
    await db.commit()
    await db.refresh(session)
    
    return session

async def continue_interview(session_id: uuid.UUID, user_message: str, code: str, db: AsyncSession):
    query = select(InterviewSession).where(InterviewSession.id == session_id)
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        return None
        
    conversation = list(session.conversation)
    
    # Add user message
    user_entry = {"role": "user", "content": f"Message: {user_message}\nCode: {code}", "timestamp": datetime.now(timezone.utc).isoformat()}
    conversation.append(user_entry)
    
    # Extract recent context
    context = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation[-5:]])
    
    prompt = f"Candidate says: {user_message}\nCandidate's code: {code}\n\nRespond as the interviewer based on this context:\n{context}"
    
    ai_response = await ai_service.generate(prompt=prompt)
    
    # Add AI response
    ai_entry = {"role": "assistant", "content": ai_response, "timestamp": datetime.now(timezone.utc).isoformat()}
    conversation.append(ai_entry)
    
    session.conversation = conversation
    await db.commit()
    await db.refresh(session)
    
    return ai_response

async def end_interview(session_id: uuid.UUID, db: AsyncSession):
    query = select(InterviewSession).where(InterviewSession.id == session_id)
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        return None
        
    conversation = list(session.conversation)
    context = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation])
    
    prompt = f"The interview is over. Evaluate the candidate's performance based on the following transcript and provide final feedback and a score from 0 to 100. Format your response clearly.\n\nTranscript:\n{context}"
    
    final_feedback = await ai_service.generate(prompt=prompt)
    
    session.status = 'completed'
    session.completed_at = datetime.now(timezone.utc)
    session.final_feedback = final_feedback
    
    # Basic score extraction logic (can be improved)
    try:
        import re
        match = re.search(r'Score[:\s]*(\d{1,3})', final_feedback, re.IGNORECASE)
        if match:
            session.score = int(match.group(1))
        else:
            session.score = 70  # Default
    except:
        session.score = 70
        
    await db.commit()
    await db.refresh(session)
    
    return session
