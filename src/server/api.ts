import { Router } from 'express';
import { prisma } from './db.js';

export const apiRouter = Router();

// --- Users ---
apiRouter.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

apiRouter.patch('/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const requestingUserId = req.headers['x-user-id'];

  if (!requestingUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const requestingUser = await prisma.user.findUnique({ where: { id: String(requestingUserId) } });
  if (!requestingUser || requestingUser.role.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Only admins can change roles" });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role }
    });

    await prisma.auditLog.create({
      data: {
        user_id: String(requestingUserId),
        action: 'ROLE_CHANGE',
        entity_type: 'User',
        entity_id: id,
        details: JSON.stringify({ new_role: role })
      }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to update role" });
  }
});

// --- Projects ---
apiRouter.get('/projects', async (req, res) => {
  const { include_archived, archived_only } = req.query;
  const where: any = {};

  if (archived_only === 'true') {
    where.archived_flag = true;
  } else if (include_archived !== 'true') {
    where.archived_flag = false;
  }

  const projects = await prisma.project.findMany({ where });
  res.json(projects);
});

apiRouter.post('/projects', async (req, res) => {
  const requestingUserId = req.headers['x-user-id'];
  const newProject = await prisma.project.create({
    data: req.body
  });

  if (requestingUserId) {
    await prisma.auditLog.create({
      data: {
        user_id: String(requestingUserId),
        action: 'PROJECT_CREATE',
        entity_type: 'Project',
        entity_id: newProject.id,
        details: JSON.stringify({ name: newProject.name, code: newProject.code })
      }
    });
  }

  res.status(201).json(newProject);
});

apiRouter.patch('/projects/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const requestingUserId = req.headers['x-user-id'];
  
  if (updates.target_start_date) updates.target_start_date = new Date(updates.target_start_date);
  if (updates.target_end_date) updates.target_end_date = new Date(updates.target_end_date);

  const currentProject = await prisma.project.findUnique({ where: { id } });

  const updatedProject = await prisma.project.update({
    where: { id },
    data: updates
  });

  if (requestingUserId && currentProject) {
    if (updates.archived_flag !== undefined && updates.archived_flag !== currentProject.archived_flag) {
      await prisma.auditLog.create({
        data: {
          user_id: String(requestingUserId),
          action: updates.archived_flag ? 'PROJECT_ARCHIVE' : 'PROJECT_UNARCHIVE',
          entity_type: 'Project',
          entity_id: id,
          details: JSON.stringify({ name: currentProject.name })
        }
      });
    }
  }

  res.json(updatedProject);
});

apiRouter.delete('/projects/:id', async (req, res) => {
  const { id } = req.params;
  const requestingUserId = req.headers['x-user-id'];

  if (!requestingUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const requestingUser = await prisma.user.findUnique({ where: { id: String(requestingUserId) } });
  if (!requestingUser || requestingUser.role.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Only admins can delete projects" });
  }

  try {
    // Unlink tasks from this project before deleting
    await prisma.task.updateMany({
      where: { project_id: id },
      data: { project_id: null }
    });
    
    const projectToDelete = await prisma.project.findUnique({ where: { id } });

    await prisma.project.delete({
      where: { id }
    });

    if (projectToDelete) {
      await prisma.auditLog.create({
        data: {
          user_id: String(requestingUserId),
          action: 'PROJECT_DELETE',
          entity_type: 'Project',
          entity_id: id,
          details: JSON.stringify({ name: projectToDelete.name, code: projectToDelete.code })
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// --- Tasks ---
apiRouter.get('/tasks/today', async (req, res) => {
  try {
    const { user_id, date, include_archived } = req.query;
    
    // Default to today if no date provided
    const targetDate = date ? new Date(String(date)) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const whereClause: any = {
      owner_user_id: user_id ? String(user_id) : undefined,
      task_date: {
        gte: startOfDay,
        lte: endOfDay,
      }
    };

    if (include_archived !== 'true') {
      whereClause.archived_flag = false;
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
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
  const { date, owner_id, project_id, include_archived, archived_only } = req.query;
  const where: any = {};

  if (archived_only === 'true') {
    where.archived_flag = true;
  } else if (include_archived !== 'true') {
    where.archived_flag = false;
  }

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
  const { title, owner_user_id, project_id, status, priority, planned_hours, task_date, due_date, description, carry_over_flag, source_type } = req.body;
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
      description: description || null,
      carry_over_flag: carry_over_flag || false,
      source_type: source_type || 'manual',
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
    const requestingUserId = req.headers['x-user-id'];

    // Get current task to check if owner changed
    const currentTask = await prisma.task.findUnique({ where: { id } });

    let reminder_sent = undefined;
    if (updates.due_date && currentTask?.due_date) {
      const newDueDate = new Date(updates.due_date);
      if (newDueDate.getTime() !== currentTask.due_date.getTime()) {
        reminder_sent = false;
      }
    } else if (updates.due_date && !currentTask?.due_date) {
      reminder_sent = false;
    }

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
        description: updates.description,
        carry_over_flag: updates.carry_over_flag,
        reminder_sent: reminder_sent,
        archived_flag: updates.archived_flag !== undefined ? updates.archived_flag : undefined,
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

    // Log if status changed
    if (updates.status && currentTask && currentTask.status !== updates.status && requestingUserId) {
      await prisma.auditLog.create({
        data: {
          user_id: String(requestingUserId),
          action: 'TASK_STATUS_UPDATE',
          entity_type: 'Task',
          entity_id: id,
          details: JSON.stringify({ old_status: currentTask.status, new_status: updates.status })
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

  const currentTask = await prisma.task.findUnique({ where: { id } });

  // Convert date strings to Date objects if present
  if (updates.task_date) updates.task_date = new Date(updates.task_date);
  if (updates.due_date) {
    updates.due_date = new Date(updates.due_date);
    if (currentTask?.due_date && updates.due_date.getTime() !== currentTask.due_date.getTime()) {
      updates.reminder_sent = false;
    } else if (!currentTask?.due_date) {
      updates.reminder_sent = false;
    }
  }
  
  const updatedTask = await prisma.task.update({
    where: { id },
    data: updates
  });
  
  res.json(updatedTask);
});

// --- Task Dependencies ---
apiRouter.get('/tasks/:id/dependencies', async (req, res) => {
  const { id } = req.params;
  const dependencies = await prisma.taskDependency.findMany({
    where: { task_id: id },
    include: { depends_on: true }
  });
  res.json(dependencies);
});

apiRouter.get('/projects/:id/dependencies', async (req, res) => {
  const { id } = req.params;
  const dependencies = await prisma.taskDependency.findMany({
    where: {
      task: {
        project_id: id
      }
    }
  });
  res.json(dependencies);
});

apiRouter.post('/tasks/:id/dependencies', async (req, res) => {
  const { id } = req.params;
  const { depends_on_task_id } = req.body;
  
  if (id === depends_on_task_id) {
    return res.status(400).json({ error: "Task cannot depend on itself" });
  }

  try {
    const newDependency = await prisma.taskDependency.create({
      data: {
        task_id: id,
        depends_on_task_id
      },
      include: { depends_on: true }
    });
    res.status(201).json(newDependency);
  } catch (error) {
    res.status(400).json({ error: "Dependency already exists or invalid task ID" });
  }
});

apiRouter.delete('/tasks/:id/dependencies/:dependencyId', async (req, res) => {
  const { dependencyId } = req.params;
  try {
    await prisma.taskDependency.delete({
      where: { id: dependencyId }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete dependency" });
  }
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

// --- Audit Logs ---
apiRouter.get('/audit-logs', async (req, res) => {
  const requestingUserId = req.headers['x-user-id'];

  if (!requestingUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const requestingUser = await prisma.user.findUnique({ where: { id: String(requestingUserId) } });
  if (!requestingUser || requestingUser.role.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Only admins can view audit logs" });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      include: { user: true },
      take: 100 // Limit to last 100 for performance
    });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// --- Meeting Inbox Suggestions ---
apiRouter.get('/suggestions', async (req, res) => {
  const suggestions = await prisma.taskSuggestion.findMany({
    where: { status: 'pending_review' }
  });
  res.json(suggestions);
});
