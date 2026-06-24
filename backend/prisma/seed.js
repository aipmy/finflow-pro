import { prisma } from "../src/core/database.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding started...");

  // 1. Seed Roles
  const rolesData = [
    { name: "admin", description: "System Administrator" },
    { name: "finance", description: "Finance Officer" },
    { name: "supervisor", description: "Site Supervisor" },
    { name: "manager", description: "Department Manager" },
    { name: "staff", description: "Field/Technical Staff" },
    { name: "auditor", description: "Internal/External Auditor" },
  ];

  const roles = {};
  for (const role of rolesData) {
    roles[role.name] = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log("Roles seeded.");

  // 2. Seed Permissions
  const permissionsData = [
    { name: "request:create", description: "Create purchase requests" },
    { name: "request:read", description: "Read purchase requests" },
    { name: "request:approve", description: "Approve purchase requests" },
    { name: "request:update", description: "Update purchase requests" },
    { name: "finance:realize", description: "Process payments/realization" },
    { name: "inventory:read", description: "View inventory" },
    { name: "inventory:write", description: "Manage inventory stocks" },
    { name: "reports:read", description: "View reports" },
    { name: "audit:read", description: "View audit trail logs" },
  ];

  const permissions = {};
  for (const perm of permissionsData) {
    permissions[perm.name] = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log("Permissions seeded.");

  // 3. Link Role Permissions
  // Admin gets everything
  for (const perm of Object.values(permissions)) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles["admin"].id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: roles["admin"].id,
        permissionId: perm.id,
      },
    });
  }

  // Finance permissions
  const financePerms = ["request:read", "request:approve", "finance:realize", "inventory:read", "reports:read"];
  for (const name of financePerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles["finance"].id,
          permissionId: permissions[name].id,
        },
      },
      update: {},
      create: {
        roleId: roles["finance"].id,
        permissionId: permissions[name].id,
      },
    });
  }

  // Supervisor & Manager permissions
  const approvalPerms = ["request:create", "request:read", "request:approve", "inventory:read"];
  for (const name of approvalPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles["supervisor"].id,
          permissionId: permissions[name].id,
        },
      },
      update: {},
      create: {
        roleId: roles["supervisor"].id,
        permissionId: permissions[name].id,
      },
    });
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles["manager"].id,
          permissionId: permissions[name].id,
        },
      },
      update: {},
      create: {
        roleId: roles["manager"].id,
        permissionId: permissions[name].id,
      },
    });
  }

  // Staff permissions
  const staffPerms = ["request:create", "request:read", "inventory:read"];
  for (const name of staffPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles["staff"].id,
          permissionId: permissions[name].id,
        },
      },
      update: {},
      create: {
        roleId: roles["staff"].id,
        permissionId: permissions[name].id,
      },
    });
  }

  // Auditor permissions
  const auditorPerms = ["request:read", "inventory:read", "reports:read", "audit:read"];
  for (const name of auditorPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles["auditor"].id,
          permissionId: permissions[name].id,
        },
      },
      update: {},
      create: {
        roleId: roles["auditor"].id,
        permissionId: permissions[name].id,
      },
    });
  }
  console.log("Role permissions mapped.");

  // 4. Seed Departments
  const departmentsData = [
    { name: "Operasional" },
    { name: "Teknik" },
    { name: "Finance" },
    { name: "HRD" },
    { name: "IT" },
  ];
  const departments = {};
  for (const dept of departmentsData) {
    departments[dept.name] = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }
  console.log("Departments seeded.");

  // 5. Seed Sites
  const sitesData = [
    { name: "Site Jakarta" },
    { name: "Site Bandung" },
    { name: "Site Surabaya" },
    { name: "Site Bekasi" },
  ];
  const sites = {};
  for (const site of sitesData) {
    sites[site.name] = await prisma.site.upsert({
      where: { name: site.name },
      update: {},
      create: site,
    });
  }
  console.log("Sites seeded.");

  // 6. Seed Expense Categories
  const categoriesData = [
    { name: "Sparepart", color: "info" },
    { name: "ATK", color: "warning" },
    { name: "Bensin & Tol", color: "accent" },
    { name: "Konsumsi", color: "success" },
    { name: "Maintenance", color: "info" },
    { name: "Perjalanan Dinas", color: "primary" },
    { name: "Petty Cash", color: "warning" },
  ];
  const categories = {};
  for (const cat of categoriesData) {
    categories[cat.name] = await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log("Expense categories seeded.");

  // 7. Seed Units
  const unitsData = [
    { name: "Pcs" },
    { name: "Liter" },
    { name: "Rim" },
    { name: "Box" },
    { name: "Lot" },
    { name: "Hari" },
    { name: "Minggu" },
    { name: "Pax" },
    { name: "Unit" },
    { name: "Set" },
  ];
  const units = {};
  for (const unit of unitsData) {
    units[unit.name] = await prisma.unit.upsert({
      where: { name: unit.name },
      update: {},
      create: unit,
    });
  }
  console.log("Units seeded.");

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
