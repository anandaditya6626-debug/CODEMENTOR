import logging
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID
from collections import Counter, defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, extract, Integer
from app.models.user import User, Profile
from app.models.problem import Problem, Topic, ProblemTag
from app.models.submission import Submission
from app.models.learning import UserTopicProgress, BugPattern

logger = logging.getLogger(__name__)

class AnalyticsService:
    
    async def get_overview_stats(self, user_id: UUID, db: AsyncSession) -> dict:
        """Get comprehensive overview stats."""
        profile_result = await db.execute(select(Profile).where(Profile.user_id == user_id))
        profile = profile_result.scalar_one_or_none()
        
        # Total submissions
        sub_count = await db.execute(
            select(func.count(Submission.id)).where(
                and_(Submission.user_id == user_id, Submission.is_run == False)
            )
        )
        total_submissions = sub_count.scalar() or 0
        
        # Accepted submissions
        acc_count = await db.execute(
            select(func.count(Submission.id)).where(
                and_(Submission.user_id == user_id, Submission.status == 'accepted', Submission.is_run == False)
            )
        )
        accepted_submissions = acc_count.scalar() or 0
        
        # Problems by difficulty
        difficulty_result = await db.execute(
            select(Problem.difficulty, func.count(func.distinct(Submission.problem_id)))
            .join(Submission, Submission.problem_id == Problem.id)
            .where(and_(Submission.user_id == user_id, Submission.status == 'accepted'))
            .group_by(Problem.difficulty)
        )
        by_difficulty = {row[0]: row[1] for row in difficulty_result.all()}
        
        # Languages used
        lang_result = await db.execute(
            select(Submission.language, func.count(Submission.id))
            .where(and_(Submission.user_id == user_id, Submission.is_run == False))
            .group_by(Submission.language)
            .order_by(desc(func.count(Submission.id)))
        )
        languages = [{'language': row[0], 'count': row[1]} for row in lang_result.all()]
        
        return {
            'problems_solved': profile.problems_solved if profile else 0,
            'current_streak': profile.current_streak if profile else 0,
            'longest_streak': profile.longest_streak if profile else 0,
            'accuracy': profile.accuracy_percentage if profile else 0,
            'total_submissions': total_submissions,
            'accepted_submissions': accepted_submissions,
            'acceptance_rate': round(accepted_submissions / max(total_submissions, 1) * 100, 1),
            'total_time_spent_minutes': profile.total_time_spent_minutes if profile else 0,
            'by_difficulty': {
                'easy': by_difficulty.get('easy', 0),
                'medium': by_difficulty.get('medium', 0),
                'hard': by_difficulty.get('hard', 0),
            },
            'languages': languages,
            'learning_progress': profile.learning_progress if profile else 0,
        }
    
    async def get_submission_trends(self, user_id: UUID, db: AsyncSession, days: int = 30) -> list[dict]:
        """Get daily submission counts for the last N days."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        result = await db.execute(
            select(
                func.date(Submission.created_at).label('day'),
                func.count(Submission.id).label('total'),
                func.sum(func.cast(Submission.status == 'accepted', Integer)).label('accepted'),
            )
            .where(and_(Submission.user_id == user_id, Submission.created_at >= start_date, Submission.is_run == False))
            .group_by(func.date(Submission.created_at))
            .order_by(func.date(Submission.created_at))
        )
        rows = result.all()
        
        # Fill in missing days with zeros
        date_map = {str(row[0]): {'date': str(row[0]), 'total': row[1], 'accepted': row[2] or 0} for row in rows}
        trends = []
        for i in range(days):
            d = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime('%Y-%m-%d')
            trends.append(date_map.get(d, {'date': d, 'total': 0, 'accepted': 0}))
        
        return trends
    
    async def get_topic_radar(self, user_id: UUID, db: AsyncSession) -> list[dict]:
        """Get accuracy by topic for radar chart."""
        result = await db.execute(
            select(UserTopicProgress, Topic.name)
            .join(Topic, Topic.id == UserTopicProgress.topic_id)
            .where(UserTopicProgress.user_id == user_id)
            .order_by(Topic.display_order)
        )
        rows = result.all()
        
        return [{
            'topic': row[1],
            'accuracy': row[0].accuracy,
            'confidence': row[0].confidence,
            'problems_solved': row[0].problems_solved,
            'problems_attempted': row[0].problems_attempted,
        } for row in rows]
    
    async def get_activity_heatmap(self, user_id: UUID, db: AsyncSession, weeks: int = 52) -> list[dict]:
        """Get activity data for heatmap (GitHub-style)."""
        start_date = datetime.utcnow() - timedelta(weeks=weeks)
        
        result = await db.execute(
            select(
                func.date(Submission.created_at).label('day'),
                func.count(Submission.id).label('count'),
            )
            .where(and_(Submission.user_id == user_id, Submission.created_at >= start_date))
            .group_by(func.date(Submission.created_at))
        )
        rows = result.all()
        
        date_map = {str(row[0]): row[1] for row in rows}
        heatmap = []
        for i in range(weeks * 7):
            d = (datetime.utcnow() - timedelta(days=weeks * 7 - 1 - i))
            ds = d.strftime('%Y-%m-%d')
            heatmap.append({
                'date': ds,
                'count': date_map.get(ds, 0),
                'weekday': d.weekday(),
                'week': i // 7,
            })
        
        return heatmap
    
    async def get_progress_over_time(self, user_id: UUID, db: AsyncSession, months: int = 6) -> list[dict]:
        """Get monthly progress summary."""
        start_date = datetime.utcnow() - timedelta(days=months * 30)
        
        result = await db.execute(
            select(
                extract('year', Submission.created_at).label('year'),
                extract('month', Submission.created_at).label('month'),
                func.count(func.distinct(Submission.problem_id)).label('problems'),
                func.count(Submission.id).label('submissions'),
            )
            .where(and_(
                Submission.user_id == user_id,
                Submission.created_at >= start_date,
                Submission.status == 'accepted',
                Submission.is_run == False,
            ))
            .group_by('year', 'month')
            .order_by('year', 'month')
        )
        rows = result.all()
        
        return [{
            'month': f"{int(row[0])}-{int(row[1]):02d}",
            'problems_solved': row[2],
            'submissions': row[3],
        } for row in rows]
    
    async def get_difficulty_distribution(self, user_id: UUID, db: AsyncSession) -> dict:
        """Get solved problems distribution by difficulty."""
        result = await db.execute(
            select(Problem.difficulty, func.count(func.distinct(Problem.id)))
            .join(Submission, Submission.problem_id == Problem.id)
            .where(and_(Submission.user_id == user_id, Submission.status == 'accepted'))
            .group_by(Problem.difficulty)
        )
        data = {row[0]: row[1] for row in result.all()}
        
        # Get total problems per difficulty
        total_result = await db.execute(
            select(Problem.difficulty, func.count(Problem.id))
            .where(Problem.is_active == True)
            .group_by(Problem.difficulty)
        )
        totals = {row[0]: row[1] for row in total_result.all()}
        
        return {
            'easy': {'solved': data.get('easy', 0), 'total': totals.get('easy', 0)},
            'medium': {'solved': data.get('medium', 0), 'total': totals.get('medium', 0)},
            'hard': {'solved': data.get('hard', 0), 'total': totals.get('hard', 0)},
        }
    
    async def get_recent_activity(self, user_id: UUID, db: AsyncSession, limit: int = 20) -> list[dict]:
        """Get recent submissions with problem details."""
        result = await db.execute(
            select(Submission, Problem.title, Problem.slug, Problem.difficulty)
            .join(Problem, Problem.id == Submission.problem_id)
            .where(and_(Submission.user_id == user_id, Submission.is_run == False))
            .order_by(desc(Submission.created_at))
            .limit(limit)
        )
        rows = result.all()
        
        return [{
            'id': str(row[0].id),
            'problem_title': row[1],
            'problem_slug': row[2],
            'difficulty': row[3],
            'language': row[0].language,
            'status': row[0].status,
            'runtime_ms': row[0].runtime_ms,
            'memory_kb': row[0].memory_kb,
            'created_at': row[0].created_at.isoformat() if row[0].created_at else None,
        } for row in rows]


analytics_service = AnalyticsService()
