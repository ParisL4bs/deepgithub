"""first-migration

Revision ID: b02643955138
Revises: b389592974f8
Create Date: 2025-05-09 23:41:42.260767

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import fastapi_users_db_sqlalchemy


# revision identifiers, used by Alembic.
revision: str = 'b02643955138'
down_revision: Union[str, None] = 'b389592974f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('repositories',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('github_id', sa.Integer(), nullable=True),
    sa.Column('owner', sa.String(), nullable=True),
    sa.Column('name', sa.String(), nullable=True),
    sa.Column('full_name', sa.String(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('default_branch', sa.String(), nullable=True),
    sa.Column('stars', sa.Integer(), nullable=True),
    sa.Column('forks', sa.Integer(), nullable=True),
    sa.Column('size', sa.Integer(), nullable=True),
    sa.Column('status', sa.Enum('NOT_INDEXED', 'PENDING', 'INDEXED', 'FAILED', name='repostatus'), nullable=True),
    sa.Column('checkout_session_id', sa.String(), nullable=True),
    sa.Column('indexed_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_repositories_full_name'), 'repositories', ['full_name'], unique=True)
    op.create_index(op.f('ix_repositories_github_id'), 'repositories', ['github_id'], unique=True)
    op.create_index(op.f('ix_repositories_id'), 'repositories', ['id'], unique=False)
    op.create_index(op.f('ix_repositories_name'), 'repositories', ['name'], unique=False)
    op.create_index(op.f('ix_repositories_owner'), 'repositories', ['owner'], unique=False)
    op.create_table('repository_files',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('repository_id', sa.Integer(), nullable=True),
    sa.Column('path', sa.String(), nullable=True),
    sa.Column('type', sa.String(), nullable=True),
    sa.Column('size', sa.Integer(), nullable=True),
    sa.Column('language', sa.String(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_repository_files_id'), 'repository_files', ['id'], unique=False)
    op.create_index(op.f('ix_repository_files_path'), 'repository_files', ['path'], unique=False)
    op.create_index(op.f('ix_repository_files_repository_id'), 'repository_files', ['repository_id'], unique=False)
    op.create_table('code_units',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('repository_id', sa.Integer(), nullable=True),
    sa.Column('file_id', sa.Integer(), nullable=True),
    sa.Column('name', sa.String(), nullable=True),
    sa.Column('type', sa.String(), nullable=True),
    sa.Column('start_line', sa.Integer(), nullable=True),
    sa.Column('end_line', sa.Integer(), nullable=True),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('embedding_id', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['file_id'], ['repository_files.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_code_units_file_id'), 'code_units', ['file_id'], unique=False)
    op.create_index(op.f('ix_code_units_id'), 'code_units', ['id'], unique=False)
    op.create_index(op.f('ix_code_units_name'), 'code_units', ['name'], unique=False)
    op.create_index(op.f('ix_code_units_repository_id'), 'code_units', ['repository_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_code_units_repository_id'), table_name='code_units')
    op.drop_index(op.f('ix_code_units_name'), table_name='code_units')
    op.drop_index(op.f('ix_code_units_id'), table_name='code_units')
    op.drop_index(op.f('ix_code_units_file_id'), table_name='code_units')
    op.drop_table('code_units')
    op.drop_index(op.f('ix_repository_files_repository_id'), table_name='repository_files')
    op.drop_index(op.f('ix_repository_files_path'), table_name='repository_files')
    op.drop_index(op.f('ix_repository_files_id'), table_name='repository_files')
    op.drop_table('repository_files')
    op.drop_index(op.f('ix_repositories_owner'), table_name='repositories')
    op.drop_index(op.f('ix_repositories_name'), table_name='repositories')
    op.drop_index(op.f('ix_repositories_id'), table_name='repositories')
    op.drop_index(op.f('ix_repositories_github_id'), table_name='repositories')
    op.drop_index(op.f('ix_repositories_full_name'), table_name='repositories')
    op.drop_table('repositories')
    # ### end Alembic commands ###
