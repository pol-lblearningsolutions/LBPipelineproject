import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function initDb() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('Initializing database with seed data...');
    
    const u1 = await prisma.user.create({ data: { id: 'u1', full_name: 'Ben Woestman', email: 'ben@lblearningsolutions.com', role: 'member' } });
    const u2 = await prisma.user.create({ data: { id: 'u2', full_name: 'Lblearningsolutions Hello', email: 'hello@lblearningsolutions.com', role: 'member' } });
    const u3 = await prisma.user.create({ data: { id: 'u3', full_name: 'Lyden Egbert', email: 'lyden@lblearningsolutions.com', role: 'member' } });
    const u4 = await prisma.user.create({ data: { id: 'u4', full_name: 'Pol Benliro', email: 'pol@lblearningsolutions.com', role: 'admin' } });

    const p1 = await prisma.project.create({ data: { id: 'p1', name: 'Internal Operations', code: 'OPS-01', owner_user_id: 'u4', status: 'Active', priority: 'High' } });
    const p2 = await prisma.project.create({ data: { id: 'p2', name: 'Client Deliverables', code: 'CLI-01', owner_user_id: 'u1', status: 'Active', priority: 'Medium' } });

    await prisma.task.create({ data: { id: 't1', task_code: 'TSK-1001', title: 'Review weekly metrics', owner_user_id: 'u4', project_id: 'p1', status: 'In Progress', priority: 'High', planned_hours: 2.0, task_date: new Date(), due_date: new Date(Date.now() + 2 * 86400000) } });
    await prisma.task.create({ data: { id: 't2', task_code: 'TSK-1002', title: 'Prepare client presentation', owner_user_id: 'u1', project_id: 'p2', status: 'Not Started', priority: 'Medium', planned_hours: 4.5, task_date: new Date(), due_date: new Date(Date.now() + 2 * 86400000) } });
    await prisma.task.create({ data: { id: 't3', task_code: 'TSK-1003', title: 'Update training materials', owner_user_id: 'u3', project_id: 'p1', status: 'Blocked', priority: 'Critical', planned_hours: 3.0, blocked_flag: true, blocker_reason: 'Waiting on feedback from Ben', task_date: new Date(), due_date: new Date(Date.now() + 2 * 86400000) } });
  }
}
