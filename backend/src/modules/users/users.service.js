import { prisma } from "../../core/database.js";
import bcrypt from "bcryptjs";

export const usersService = {
  list: async () => {
    return prisma.user.findMany({
      include: {
        role: true,
        department: true,
        site: true,
        sessions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  },

  create: async (data) => {
    const { name, username, email, password, roleId, departmentId, siteId, active } = data;
    
    // Hash password
    const passwordHash = await bcrypt.hash(password || "password123", 10);

    return prisma.user.create({
      data: {
        name,
        username,
        email,
        password: passwordHash,
        roleId,
        departmentId: departmentId || null,
        siteId: siteId || null,
        active: active !== undefined ? active : true,
      },
      include: {
        role: true,
        department: true,
        site: true,
      }
    });
  },

  update: async (id, data) => {
    const { name, username, email, password, roleId, departmentId, siteId, active } = data;
    
    const updateData = {
      name,
      username,
      email,
      roleId,
      departmentId: departmentId || null,
      siteId: siteId || null,
      active: active !== undefined ? active : true,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
        department: true,
        site: true,
      }
    });
  },

  delete: async (id) => {
    return prisma.user.delete({
      where: { id }
    });
  }
};
