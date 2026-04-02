import { Router } from 'express';
import { prisma } from './db.js';

export const apiRouter = Router();

// --- Users ---
apiRouter.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// --- Projects ---
apiRouter.get('/projects', async (req, res) => {
  const projects = await prisma.project.findMany();
  res.json(projects);
});

apiRouter.post('/projects', async (req, res) => {
  const newProject = await prisma.project.create({
    data: req.body
  });
  res.status(201).json(newProject);
});

apiRouter.patch('/projects/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  if (updates.target_start_date) updates.target_start_date = new Date(updates.target_start_date);
  if (updates.target_end_date) updates.target_end_date = new Date(updates.target_end_date);

  const updatedProject = await prisma.project.update({
    where: { id },
    data: updates
  });
  res.json(updatedProject);
});

apiRouter.delete('/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Unlink tasks from this project before deleting
    await prisma.task.updateMany({
      where: { project_id: id },
      data: { project_id: null }
    });
    
    await prisma.project.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// --- Tasks ---
apiRouter.get('/tasks/today', async (req, res) => {
  try {
    const { user_id, date } = req.query;
    
    // Default to today if no date provided
    const targetDate = date ? new Date(String(date)) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const tasks = await prisma.task.findMany({
      where: {
        owner_user_id: user_id ? String(user_id) : undefined,
        task_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        archived_flag: false
      },
      include: { project: true },
      orderBy: { created_at: 'asc' } // Maintains grid order
    });

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch today's tasks." });
  }
});

apiRouter.get('/tasks', async (req, res) => {
  const { date, owner_id, project_id } = req.query;
  const where: any = { archived_flag: false };

  if (date) {
    const startOfDay = new Date(date as string);
    const endOfDay = new Date(date as string);
    endOfDay.setDate(endOfDay.getDate() + 1);
    where.task_date = { gte: startOfDay, lt: endOfDay };
  }
  if (owner_id) {
    where.owner_user_id = owner_id;
  }
  if (project_id) {
    where.project_id = project_id;
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { created_at: 'desc' }
  });
  res.json(tasks);
});

apiRouter.post('/tasks', async (req, res) => {
  const { title, owner_user_id, project_id, status, priority, planned_hours, task_date, due_date } = req.body;
  const task_code = 'TSK-' + Math.floor(Math.random() * 10000);
  
  const newTask = await prisma.task.create({
    data: {
      task_code,
      title,
      owner_user_id: owner_user_id || null,
      project_id: project_id || null,
      status: status || 'Not Started',
      priority: priority || 'Medium',
      planned_hours: planned_hours || null,
      task_date: task_date ? new Date(task_date) : null,
      due_date: due_date ? new Date(due_date) : null,
    }
  });

  // Create notification if assigned to someone
  if (owner_user_id) {
    await prisma.notification.create({
      data: {
        user_id: owner_user_id,
        message: `You were assigned a new task: "${title}"`
      }
    });
  }
  
  res.status(201).json(newTask);
});

apiRouter.patch('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get current task to check if owner changed
    const currentTask = await prisma.task.findUnique({ where: { id } });

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: updates.title,
        status: updates.status,
        priority: updates.priority,
        planned_hours: updates.planned_hours !== undefined ? (updates.planned_hours === null ? null : parseFloat(updates.planned_hours)) : undefined,
        actual_hours: updates.actual_hours !== undefined ? (updates.actual_hours === null ? null : parseFloat(updates.actual_hours)) : undefined,
        blocked_flag: updates.blocked_flag,
        blocker_reason: updates.blocker_reason,
        owner_user_id: updates.owner_user_id,
        project_id: updates.project_id,
        due_date: updates.due_date ? new Date(updates.due_date) : undefined,
      }
    });

    // Create notification if owner changed and is not null
    if (updates.owner_user_id && currentTask && currentTask.owner_user_id !== updates.owner_user_id) {
      await prisma.notification.create({
        data: {
          user_id: updates.owner_user_id,
          message: `You were tagged in a task: "${updatedTask.title}"`
        }
      });
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task inline." });
  }
});

apiRouter.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Remove id and created_at from updates
  delete updates.id;
  delete updates.created_at;
  delete updates.updated_at;

  // Convert date strings to Date objects if present
  if (updates.task_date) updates.task_date = new Date(updates.task_date);
  if (updates.due_date) updates.due_date = new Date(updates.due_date);
  
  const updatedTask = await prisma.task.update({
    where: { id },
    data: updates
  });
  
  res.json(updatedTask);
});

// --- Notifications ---
apiRouter.get('/notifications', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  const notifications = await prisma.notification.findMany({
    where: { user_id: String(user_id) },
    orderBy: { created_at: 'desc' },
    take: 20
  });
  res.json(notifications);
});

apiRouter.post('/notifications/mark-read', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  await prisma.notification.updateMany({
    where: { user_id: String(user_id), read: false },
    data: { read: true }
  });
  res.json({ success: true });
});

// --- Meeting Inbox Suggestions ---
apiRouter.get('/suggestions', async (req, res) => {
  const suggestions = await prisma.taskSuggestion.findMany({
    where: { status: 'pending_review' }
  });
  res.json(suggestions);
});
