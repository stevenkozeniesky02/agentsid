"""add teams and team members

Revision ID: a1b2c3d4e5f6
Revises: 35a9e5cf497f
Create Date: 2026-04-08 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '35a9e5cf497f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create teams and team_members tables, add team_id to projects."""
    op.create_table(
        'teams',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('owner_email', sa.String(255), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        'team_members',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('team_id', sa.String(50), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('email', sa.String(255), nullable=False, index=True),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('invited_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index('ix_team_member_unique', 'team_members', ['team_id', 'email'], unique=True)

    op.add_column('projects', sa.Column('team_id', sa.String(50), sa.ForeignKey('teams.id'), nullable=True, index=True))


def downgrade() -> None:
    """Drop team_id from projects, drop team_members and teams."""
    op.drop_column('projects', 'team_id')
    op.drop_index('ix_team_member_unique', table_name='team_members')
    op.drop_table('team_members')
    op.drop_table('teams')
