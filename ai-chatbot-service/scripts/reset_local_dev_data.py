#!/usr/bin/env python3
"""Reset local Eduvia chatbot development data without touching source code."""

from __future__ import annotations

import argparse
import shutil
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class CleanupSummary:
    deleted_files: list[str] = field(default_factory=list)
    recreated_dirs: list[str] = field(default_factory=list)
    deleted_knowledge_rows: dict[str, int] = field(default_factory=dict)
    removed_test_artifacts: list[str] = field(default_factory=list)
    skipped_paths: list[str] = field(default_factory=list)


ROOT = Path(__file__).resolve().parents[2]
SERVICE_ROOT = Path(__file__).resolve().parents[1]

UPLOAD_DIRS = [
    ROOT / 'uploads',
    SERVICE_ROOT / 'uploads',
]

CHROMA_DIRS = [
    ROOT / 'chroma_db',
    SERVICE_ROOT / 'chroma_db',
]

SQLITE_DATABASES = [
    ROOT / 'eduvia_chatbot.db',
    SERVICE_ROOT / 'eduvia_chatbot.db',
]

ROOT_TEST_ARTIFACTS = [
    ROOT / 'PI-Rapport (1).pdf',
    ROOT / 'strict test upload.pdf',
    ROOT / 'strict_rag_verification.pdf',
    ROOT / 'e2e_teacher_knowledge.pdf',
    ROOT / 'not_a_pdf.txt',
    ROOT / 'pi_rapport_page1.png',
]


def reset_directory_contents(directory: Path, summary: CleanupSummary, apply_changes: bool) -> None:
    if not directory.exists():
        summary.skipped_paths.append(f'missing:{directory}')
        if apply_changes:
            directory.mkdir(parents=True, exist_ok=True)
            summary.recreated_dirs.append(str(directory))
        return

    for item in directory.iterdir():
        if not apply_changes:
            summary.deleted_files.append(str(item))
            continue

        try:
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()
            summary.deleted_files.append(str(item))
        except PermissionError:
            summary.skipped_paths.append(f'locked:{item}')

    if apply_changes:
        directory.mkdir(parents=True, exist_ok=True)
        summary.recreated_dirs.append(str(directory))


def clear_knowledge_documents(database_path: Path, summary: CleanupSummary, apply_changes: bool) -> None:
    if not database_path.exists():
        summary.skipped_paths.append(f'missing:{database_path}')
        return

    connection = sqlite3.connect(database_path)
    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_documents'",
        )
        if cursor.fetchone() is None:
            summary.skipped_paths.append(f'no_table:{database_path}')
            return

        cursor.execute('SELECT COUNT(*) FROM knowledge_documents')
        row_count = int(cursor.fetchone()[0])
        summary.deleted_knowledge_rows[str(database_path)] = row_count

        if apply_changes:
            cursor.execute('DELETE FROM knowledge_documents')
            connection.commit()
    finally:
        connection.close()


def remove_root_test_artifacts(summary: CleanupSummary, apply_changes: bool) -> None:
    for artifact in ROOT_TEST_ARTIFACTS:
        if not artifact.exists():
            summary.skipped_paths.append(f'missing:{artifact}')
            continue

        if apply_changes:
            artifact.unlink()
        summary.removed_test_artifacts.append(str(artifact))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description='Reset local Eduvia chatbot upload/vector data while preserving code and folders.',
    )
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Perform the cleanup. Without this flag, the script runs in dry-run mode.',
    )
    parser.add_argument(
        '--keep-root-artifacts',
        action='store_true',
        help='Keep root-level QA sample files such as test PDFs and screenshots.',
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    summary = CleanupSummary()

    for upload_dir in UPLOAD_DIRS:
        reset_directory_contents(upload_dir, summary, args.apply)

    for chroma_dir in CHROMA_DIRS:
        reset_directory_contents(chroma_dir, summary, args.apply)

    for database_path in SQLITE_DATABASES:
        clear_knowledge_documents(database_path, summary, args.apply)

    if not args.keep_root_artifacts:
        remove_root_test_artifacts(summary, args.apply)

    mode = 'APPLY' if args.apply else 'DRY-RUN'
    print(f'[{mode}] Local Eduvia cleanup summary')
    print(f'Upload/vector entries to remove: {len(summary.deleted_files)}')
    print(f'Knowledge document rows to clear: {sum(summary.deleted_knowledge_rows.values())}')
    print(f'Root QA artifacts to remove: {len(summary.removed_test_artifacts)}')

    if summary.deleted_knowledge_rows:
        print('Knowledge document rows by database:')
        for path, count in summary.deleted_knowledge_rows.items():
            print(f'  - {path}: {count}')

    if summary.recreated_dirs:
        print('Directories preserved/recreated:')
        for path in summary.recreated_dirs:
            print(f'  - {path}')

    if summary.skipped_paths:
        print('Skipped paths:')
        for path in summary.skipped_paths:
            print(f'  - {path}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())