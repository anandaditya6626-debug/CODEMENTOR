import asyncio
import os
import json
from datetime import datetime, date
from sqlalchemy import select
from app.database import engine, Base, AsyncSessionLocal
import app.models  # Ensure all models are registered with Base.metadata
from app.models.user import User, Profile
from app.models.problem import Problem, Topic, ProblemTag, TestCase
from app.models.learning import DailyChallenge, Achievement, UserAchievement
from app.services.auth_service import hash_password
from seed.topics_data import TOPICS
from seed.problems_data import PROBLEMS

async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Seed Topics
        topic_map = {}
        for t_data in TOPICS:
            res = await db.execute(select(Topic).where(Topic.slug == t_data['slug']))
            topic = res.scalar_one_or_none()
            if not topic:
                topic = Topic(**t_data)
                db.add(topic)
                await db.flush()
            topic_map[topic.slug] = topic

        # Seed Problems
        for p_data in PROBLEMS:
            p_copy = dict(p_data)
            res = await db.execute(select(Problem).where(Problem.slug == p_copy['slug']))
            problem = res.scalar_one_or_none()
            if not problem:
                topics_to_link = p_copy.pop('topics', [])
                test_cases = p_copy.pop('test_cases', [])
                
                problem = Problem(**p_copy)
                db.add(problem)
                await db.flush()
                
                for t_slug in topics_to_link:
                    if t_slug in topic_map:
                        pt = ProblemTag(problem_id=problem.id, topic_id=topic_map[t_slug].id)
                        db.add(pt)
                
                for tc in test_cases:
                    db.add(TestCase(problem_id=problem.id, **tc))
                
        await db.commit()

        # Seed User Aditya
        res = await db.execute(select(User).where(User.username == 'aditya'))
        user = res.scalar_one_or_none()
        if not user:
            user = User(
                email='aditya@codementor.dev',
                username='aditya',
                hashed_password=hash_password('password123'),
                full_name='Aditya',
                is_active=True,
                is_admin=True
            )
            db.add(user)
            await db.flush()
            
            profile = Profile(
                user_id=user.id,
                problems_solved=127,
                current_streak=12,
                longest_streak=20,
                accuracy_percentage=78.0,
                learning_progress=64.0
            )
            db.add(profile)
            
            # Seed Achievement
            ach_res = await db.execute(select(Achievement).where(Achievement.slug == 'first-blood'))
            ach = ach_res.scalar_one_or_none()
            if not ach:
                ach = Achievement(
                    name='First Blood',
                    slug='first-blood',
                    description='Solved your first problem',
                    icon='🩸',
                    category='problems_solved',
                    requirement_count=1,
                    points=10
                )
                db.add(ach)
                await db.flush()

            ua = UserAchievement(
                user_id=user.id,
                achievement_id=ach.id
            )
            db.add(ua)
            await db.commit()

        # Daily challenge
        res = await db.execute(select(Problem).limit(1))
        p = res.scalar_one_or_none()
        if p:
            res_d = await db.execute(select(DailyChallenge).where(DailyChallenge.challenge_date == date.today()))
            dc = res_d.scalar_one_or_none()
            if not dc:
                dc = DailyChallenge(challenge_date=date.today(), problem_id=p.id, difficulty=p.difficulty)
                db.add(dc)
                await db.commit()
                
    print("CodeMentor Seed Data successfully loaded!")

if __name__ == "__main__":
    asyncio.run(seed_data())
