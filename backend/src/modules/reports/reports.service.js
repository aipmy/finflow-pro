import { prisma } from "../../core/database.js";

function buildDateFilter(filters) {
  const dateFilter = {};
  if (filters.startDate && filters.endDate) {
    dateFilter.gte = new Date(filters.startDate);
    dateFilter.lte = new Date(filters.endDate);
  } else if (filters.year) {
    const year = parseInt(filters.year, 10);
    if (filters.month) {
      const month = parseInt(filters.month, 10); // 1-indexed (1 = Jan, 12 = Dec)
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      dateFilter.gte = start;
      dateFilter.lte = end;
    } else {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      dateFilter.gte = start;
      dateFilter.lte = end;
    }
  }
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
}

export async function getAggregates(filters = {}) {
  const dateFilter = buildDateFilter(filters);

  // Fetch REALIZED/CLOSED requests for actual realized expenses
  const realizedWhere = { status: { in: ["REALIZED", "CLOSED"] } };
  if (dateFilter) realizedWhere.createdAt = dateFilter;

  const requests = await prisma.request.findMany({
    where: realizedWhere,
    include: {
      category: true,
      department: true,
      site: true,
      requester: true,
      financeRealization: true,
      items: {
        include: {
          category: true
        }
      }
    },
  });

  // Fetch ALL requests (non-draft) for stats like approval rate
  const allWhere = { status: { notIn: ["DRAFT"] } };
  if (dateFilter) allWhere.createdAt = dateFilter;

  const allRequests = await prisma.request.findMany({
    where: allWhere,
    include: {
      category: true,
      department: true,
      site: true,
      requester: true,
      financeRealization: true,
      items: { include: { category: true } }
    },
  });

  // Fetch manual Petty Cash transactions (OUT type, no linked request)
  const pcWhere = {
    type: "OUT",
    OR: [
      { refRequestId: null },
      { refRequestId: "-" },
      { refRequestId: "" }
    ]
  };
  if (dateFilter) pcWhere.createdAt = dateFilter;

  const pettyCashTx = await prisma.pettyCashTransaction.findMany({
    where: pcWhere
  });

  // Aggregate by category/dept/site/user
  const categoryMap = {};
  const deptMap = {};
  const siteMap = {};
  const userMap = {}; // { name: { value, count, userId, categories: { catName: amount } } }
  const monthlyMap = {}; // { "2026-01": { catName: amount, ... } }
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  requests.forEach((req) => {
    const realizedAmount = Number(req.financeRealization?.realizedAmount || req.amount);
    const amount = realizedAmount;

    // Department
    const deptName = req.department?.name || "No Department";
    deptMap[deptName] = (deptMap[deptName] || 0) + amount;

    // Site
    const siteName = req.site?.name || "No Site";
    siteMap[siteName] = (siteMap[siteName] || 0) + amount;

    // User with category breakdown setup
    const userName = req.requester?.name || "Unknown User";
    const userId = req.requester?.id || null;
    if (!userMap[userName]) {
      userMap[userName] = { value: 0, count: 0, userId, categories: {} };
    }
    userMap[userName].value += amount;
    userMap[userName].count += 1;

    // Monthly breakdown setup
    const d = new Date(req.financeRealization?.createdAt || req.createdAt);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = {};

    // Category breakdown
    if (req.items && req.items.length > 0) {
      const ratio = Number(req.amount) > 0 ? realizedAmount / Number(req.amount) : 1;
      req.items.forEach((item) => {
        const itemAmount = (Number(item.qty) * Number(item.price)) * ratio;
        const catName = item.category?.name || req.category?.name || "Tidak Terkategori";
        
        categoryMap[catName] = (categoryMap[catName] || 0) + itemAmount;
        userMap[userName].categories[catName] = (userMap[userName].categories[catName] || 0) + itemAmount;
        monthlyMap[monthKey][catName] = (monthlyMap[monthKey][catName] || 0) + itemAmount;
      });
    } else {
      const catName = req.category?.name || "Tidak Terkategori";
      
      categoryMap[catName] = (categoryMap[catName] || 0) + realizedAmount;
      userMap[userName].categories[catName] = (userMap[userName].categories[catName] || 0) + realizedAmount;
      monthlyMap[monthKey][catName] = (monthlyMap[monthKey][catName] || 0) + realizedAmount;
    }
  });

  // Add petty cash transactions to aggregates
  pettyCashTx.forEach((tx) => {
    const amount = Number(tx.amount);
    const match = tx.description.match(/^\[(.*?)\] (.*)$/);
    const catName = match ? match[1] : "Tidak Terkategori";
    categoryMap[catName] = (categoryMap[catName] || 0) + amount;

    const deptName = "Kas Kecil / Operasional";
    deptMap[deptName] = (deptMap[deptName] || 0) + amount;

    const siteName = "Pusat";
    siteMap[siteName] = (siteMap[siteName] || 0) + amount;

    const userName = "Kas Kecil (Manual)";
    if (!userMap[userName]) {
      userMap[userName] = { value: 0, count: 0, userId: null, categories: {} };
    }
    userMap[userName].value += amount;
    userMap[userName].count += 1;
    userMap[userName].categories[catName] = (userMap[userName].categories[catName] || 0) + amount;

    // Monthly
    const d = new Date(tx.createdAt);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = {};
    monthlyMap[monthKey][catName] = (monthlyMap[monthKey][catName] || 0) + amount;
  });

  const byCategory = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const byDept = Object.entries(deptMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const bySite = Object.entries(siteMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const byUser = Object.entries(userMap)
    .map(([name, data]) => ({ name, value: data.value }))
    .sort((a, b) => b.value - a.value);

  // Top spenders with category breakdown
  const topSpenders = Object.entries(userMap)
    .map(([name, data]) => ({
      name,
      value: data.value,
      count: data.count,
      userId: data.userId,
      categories: Object.entries(data.categories)
        .map(([catName, catVal]) => ({ name: catName, value: catVal }))
        .sort((a, b) => b.value - a.value)
    }))
    .sort((a, b) => b.value - a.value);

  // Merged transactions for top requests & all transactions list
  const mergedTx = [
    ...requests.map(r => ({
      id: r.id,
      title: r.title,
      code: r.code,
      amount: Number(r.financeRealization?.realizedAmount || r.amount),
      requesterName: r.requester?.name || "Unknown User",
      requesterId: r.requester?.id || null,
      categoryName: r.category?.name || (r.items && r.items.length > 0 ? r.items.find(it => it.category?.name)?.category?.name : null) || "Tidak Terkategori",
      departmentName: r.department?.name || "-",
      siteName: r.site?.name || "-",
      status: r.status,
      type: r.type,
      date: r.financeRealization?.createdAt || r.createdAt
    })),
    ...pettyCashTx.map(t => {
      const match = t.description.match(/^\[(.*?)\] (.*)$/);
      const catName = match ? match[1] : "Tidak Terkategori";
      const descName = match ? match[2] : t.description;
      return {
        id: t.id,
        title: descName,
        code: `PC-${t.id}`,
        amount: Number(t.amount),
        requesterName: "Kas Kecil (Manual)",
        requesterId: null,
        categoryName: catName,
        departmentName: "Operasional",
        siteName: "Pusat",
        status: "REALIZED",
        type: "PETTY_CASH",
        date: t.createdAt
      };
    })
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const topRequests = [...mergedTx]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Monthly breakdown as array for chart
  const allCategoryNames = [...new Set(Object.values(monthlyMap).flatMap(m => Object.keys(m)))];
  const monthlyBreakdown = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, cats]) => {
      const [y, m] = key.split("-");
      const entry = {
        month: `${months[parseInt(m, 10) - 1]} ${y}`,
        monthKey: key,
        total: Object.values(cats).reduce((acc, v) => acc + v, 0),
      };
      allCategoryNames.forEach(cat => {
        entry[cat] = cats[cat] || 0;
      });
      return entry;
    });

  // Statistics for audit
  const totalSubmitted = allRequests.length;
  const totalApproved = allRequests.filter(r => ["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "WAITING_VERIFICATION", "CLOSED"].includes(r.status)).length;
  const totalRejected = allRequests.filter(r => r.status === "REJECTED").length;
  const totalRevision = allRequests.filter(r => r.status === "NEED_REVISION").length;
  const totalPending = allRequests.filter(r => ["SUBMITTED", "APPROVED_BY_SUPERVISOR"].includes(r.status)).length;
  const approvalRate = totalSubmitted > 0 ? Math.round((totalApproved / totalSubmitted) * 100) : 0;
  const totalRealizedAmount = requests.reduce((sum, r) => sum + Number(r.financeRealization?.realizedAmount || r.amount), 0)
    + pettyCashTx.reduce((sum, t) => sum + Number(t.amount), 0);
  const avgAmount = mergedTx.length > 0 ? Math.round(totalRealizedAmount / mergedTx.length) : 0;

  const stats = {
    totalSubmitted,
    totalApproved,
    totalRejected,
    totalRevision,
    totalPending,
    approvalRate,
    totalRealizedAmount,
    avgAmount,
    totalTransactions: mergedTx.length,
  };

  // Available years
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
    allTransactions: mergedTx,
    monthlyBreakdown,
    monthlyCategories: allCategoryNames,
    stats,
    years
  };
}

export async function getUserDetail(userId, filters = {}) {
  const dateFilter = buildDateFilter(filters);

  const realizedWhere = {
    requesterId: userId,
    status: { in: ["REALIZED", "CLOSED"] }
  };
  if (dateFilter) realizedWhere.createdAt = dateFilter;

  const requests = await prisma.request.findMany({
    where: realizedWhere,
    include: {
      category: true,
      department: true,
      site: true,
      financeRealization: true,
      items: { include: { category: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true }
  });

  // Category breakdown
  const categoryMap = {};
  const monthlyMap = {};
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  let totalAmount = 0;

  requests.forEach(req => {
    const realizedAmount = Number(req.financeRealization?.realizedAmount || req.amount);
    totalAmount += realizedAmount;

    const d = new Date(req.financeRealization?.createdAt || req.createdAt);
    const monthKey = `${months[d.getMonth()]} ${d.getFullYear()}`;
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + realizedAmount;

    if (req.items && req.items.length > 0) {
      const ratio = Number(req.amount) > 0 ? realizedAmount / Number(req.amount) : 1;
      req.items.forEach((item) => {
        const itemAmount = (Number(item.qty) * Number(item.price)) * ratio;
        const catName = item.category?.name || req.category?.name || "Tidak Terkategori";
        categoryMap[catName] = (categoryMap[catName] || 0) + itemAmount;
      });
    } else {
      const catName = req.category?.name || "Tidak Terkategori";
      categoryMap[catName] = (categoryMap[catName] || 0) + realizedAmount;
    }
  });

  const byCategory = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const monthlyTrend = Object.entries(monthlyMap)
    .map(([month, value]) => ({ month, value }));

  const transactions = requests.map(r => ({
    id: r.id,
    code: r.code,
    title: r.title,
    amount: Number(r.financeRealization?.realizedAmount || r.amount),
    categoryName: r.category?.name || (r.items && r.items.length > 0 ? r.items.find(it => it.category?.name)?.category?.name : null) || "-",
    departmentName: r.department?.name || "-",
    siteName: r.site?.name || "-",
    status: r.status,
    date: r.financeRealization?.createdAt || r.createdAt
  }));

  // All requests (inc. non-realized) for stats
  const allWhere = { requesterId: userId, status: { notIn: ["DRAFT"] } };
  if (dateFilter) allWhere.createdAt = dateFilter;
  const allReqs = await prisma.request.findMany({ where: allWhere, select: { status: true, amount: true } });

  const totalSubmitted = allReqs.length;
  const totalApproved = allReqs.filter(r => ["APPROVED_BY_FINANCE", "PURCHASED", "REALIZED", "WAITING_VERIFICATION", "CLOSED"].includes(r.status)).length;
  const totalRejected = allReqs.filter(r => r.status === "REJECTED").length;
  const totalPending = allReqs.filter(r => ["SUBMITTED", "APPROVED_BY_SUPERVISOR"].includes(r.status)).length;

  return {
    user,
    totalAmount,
    totalRealized: requests.length,
    totalSubmitted,
    totalApproved,
    totalRejected,
    totalPending,
    byCategory,
    monthlyTrend,
    transactions
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
