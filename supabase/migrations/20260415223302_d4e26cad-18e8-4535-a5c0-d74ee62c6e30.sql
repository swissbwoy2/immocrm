DELETE FROM renovation_audit_logs WHERE project_id = '6819419e-e6b5-4e5d-adbf-8762dfdb5124';
DELETE FROM renovation_quotes WHERE project_id = '6819419e-e6b5-4e5d-adbf-8762dfdb5124';
DELETE FROM renovation_analysis_jobs WHERE project_id = '6819419e-e6b5-4e5d-adbf-8762dfdb5124';
DELETE FROM renovation_project_files WHERE project_id = '6819419e-e6b5-4e5d-adbf-8762dfdb5124';
DELETE FROM renovation_project_companies WHERE project_id = '6819419e-e6b5-4e5d-adbf-8762dfdb5124';
DELETE FROM renovation_milestones WHERE project_id = '6819419e-e6b5-4e5d-adbf-8762dfdb5124';
DELETE FROM renovation_projects WHERE id = '6819419e-e6b5-4e5d-adbf-8762dfdb5124';
DELETE FROM renovation_companies WHERE id IN ('aaaaaaaa-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000002');