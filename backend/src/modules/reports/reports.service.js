import { prisma } from "../../core/database.js";

export async function getAggregates(filters = {}) {
  const where = {};

  if (filters.startDate && filters.endDate) {
    where.createdAt = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };
  } else if (filters.year) {
    const year = parseInt(filters.year, 10);
    if (filters.month) {
      const month = parseInt(filters.month, 10); // 1-indexed (1 = Jan, 12 = Dec)
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    } else {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }
  }

  // Fetch requests that are in REALIZED or CLOSED status to represent actual realized expenses
  where.status = {
    in: ["REALIZED", "CLOSED"],
  };

  const requests = await prisma.request.findMany({
    where,
    include: {
      category: true,
      department: true,
      site: true,
      requester: true,
      items: {
        include: {
          category: true
        }
      }
    },
  });

  // Fetch manual Petty Cash transactions (OUT type, refRequestId is null or not a request code)
  const pcWhere = {
    type: "OUT",
    OR: [
      { refRequestId: null },
      { refRequestId: "-" },
      { refRequestId: "" }
    ]
  };
  if (filters.startDate && filters.endDate) {
    pcWhere.createdAt = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };
  } else if (filters.year) {
    const year = parseInt(filters.year, 10);
    if (filters.month) {
      const month = parseInt(filters.month, 10);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      pcWhere.createdAt = { gte: start, lte: end };
    } else {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      pcWhere.createdAt = { gte: start, lte: end };
    }
  }

  const pettyCashTx = await prisma.pettyCashTransaction.findMany({
    where: pcWhere
  });

  // Aggregate in JS to make it robust and easy
  const categoryMap = {};
  const deptMap = {};
  const siteMap = {};
  const userMap = {};

  requests.forEach((req) => {
    // Category: Check if items have specific categories
    if (req.items && req.items.length > 0) {
      req.items.forEach((item) => {
        const itemAmount = Number(item.qty) * Number(item.price);
        const catName = item.category?.name || req.category?.name || "Tidak Terkategori";
        categoryMap[catName] = (categoryMap[catName] || 0) + itemAmount;
      });
    } else {
      const amount = Number(req.amount);
      const catName = req.category?.name || "Tidak Terkategori";
      categoryMap[catName] = (categoryMap[catName] || 0) + amount;
    }

    const amount = Number(req.amount);

    // Department
    const deptName = req.department?.name || "No Department";
    deptMap[deptName] = (deptMap[deptName] || 0) + amount;

    // Site
    const siteName = req.site?.name || "No Site";
    siteMap[siteName] = (siteMap[siteName] || 0) + amount;

    // User
    const userName = req.requester?.name || "Unknown User";
    userMap[userName] = (userMap[userName] || 0) + amount;
  });

  pettyCashTx.forEach((tx) => {
    const amount = Number(tx.amount);
    
    // Category: parse from description "[CategoryName] desc"
    const match = tx.description.match(/^\[(.*?)\] (.*)$/);
    const catName = match ? match[1] : "Tidak Terkategori";
    categoryMap[catName] = (categoryMap[catName] || 0) + amount;

    // Department
    const deptName = "Kas Kecil / Operasional";
    deptMap[deptName] = (deptMap[deptName] || 0) + amount;

    // Site
    const siteName = "Pusat";
    siteMap[siteName] = (siteMap[siteName] || 0) + amount;

    // User
    const userName = "Kas Kecil (Manual)";
    userMap[userName] = (userMap[userName] || 0) + amount;
  });

  const byCategory = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  const byDept = Object.entries(deptMap).map(([name, value]) => ({ name, value }));
  const bySite = Object.entries(siteMap).map(([name, value]) => ({ name, value }));
  const byUser = Object.entries(userMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Compile all transactions (Requests + Petty Cash) to find the largest expenses and spender stats
  const mergedTx = [
    ...requests.map(r => ({
      title: r.title,
      code: r.code,
      amount: Number(r.financeRealization?.realizedAmount || r.amount),
      requesterName: r.requester?.name || "Unknown User",
      categoryName: r.category?.name || (r.items && r.items.length > 0 ? r.items.find(it => it.category?.name)?.category?.name : null) || "Tidak Terkategori",
      date: r.financeRealization?.createdAt || r.createdAt
    })),
    ...pettyCashTx.map(t => {
      const match = t.description.match(/^\[(.*?)\] (.*)$/);
      const catName = match ? match[1] : "Tidak Terkategori";
      const descName = match ? match[2] : t.description;
      return {
        title: descName,
        code: `PC-${t.id}`,
        amount: Number(t.amount),
        requesterName: "Kas Kecil (Manual)",
        categoryName: catName,
        date: t.createdAt
      };
    })
  ];

  const topRequests = [...mergedTx]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const spenderMap = {};
  mergedTx.forEach(tx => {
    const name = tx.requesterName;
    if (!spenderMap[name]) {
      spenderMap[name] = { name, value: 0, count: 0 };
    }
    spenderMap[name].value += tx.amount;
    spenderMap[name].count += 1;
  });
  const topSpenders = Object.values(spenderMap)
    .sort((a, b) => b.value - a.value);

  const allRequestsForYears = await prisma.request.findMany({
    select: { createdAt: true },
    where: { status: { in: ["REALIZED", "CLOSED"] } }
  });
  const years = Array.from(
    new Set(allRequestsForYears.map(r => new Date(r.createdAt).getFullYear()))
  ).sort((a, b) => b - a);

  return {
    byCategory,
    byDept,
    bySite,
    byUser,
    topRequests,
    topSpenders,
    years
  };
}

export async function logExport(userId, format, moduleName = "REPORTS") {
  await prisma.exportLog.create({
    data: {
      userId,
      module: moduleName,
      format,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      module: moduleName,
      action: "EXPORT",
      target: format,
    },
  });
}
