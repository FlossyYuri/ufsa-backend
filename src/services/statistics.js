import { differenceInDays, subMonths, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

function calculateMonthlyTrends(data, months = 6) {
  const now = new Date();
  const trends = [];

  for (let i = 0; i < months; i++) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));

    const monthData = {
      month: monthStart.toISOString().slice(0, 7),
      open_tenders: data.concursos_abertos.filter(tender => 
        isWithinInterval(parseISO(tender.data_lancamento), { start: monthStart, end: monthEnd })
      ).length,
      awarded_tenders: data.concursos_adjudicados.filter(tender =>
        isWithinInterval(parseISO(tender.data_adjudicacao), { start: monthStart, end: monthEnd })
      ).length,
      direct_adjustments: data.ajustes_diretos.filter(tender =>
        isWithinInterval(parseISO(tender.data), { start: monthStart, end: monthEnd })
      ).length
    };

    trends.push(monthData);
  }

  return trends.reverse();
}

function calculateGrowthRate(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function calculateValueDistribution(adjustments) {
  const ranges = {
    '0-100k': 0,
    '100k-500k': 0,
    '500k-1M': 0,
    '1M-5M': 0,
    '5M+': 0
  };

  adjustments.forEach(adj => {
    const value = adj.valor;
    if (value <= 100000) ranges['0-100k']++;
    else if (value <= 500000) ranges['100k-500k']++;
    else if (value <= 1000000) ranges['500k-1M']++;
    else if (value <= 5000000) ranges['1M-5M']++;
    else ranges['5M+']++;
  });

  return ranges;
}

function calculateProvinceDistribution(tenders) {
  const distribution = {};
  const total = tenders.length;

  tenders.forEach(tender => {
    distribution[tender.provincia] = (distribution[tender.provincia] || 0) + 1;
  });

  // Convert to percentages
  Object.keys(distribution).forEach(province => {
    distribution[province] = {
      count: distribution[province],
      percentage: (distribution[province] / total) * 100
    };
  });

  return distribution;
}

function calculateTenderTypeDistribution(tenders) {
  const distribution = {};
  const total = tenders.length;

  tenders.forEach(tender => {
    distribution[tender.tipo_concurso] = (distribution[tender.tipo_concurso] || 0) + 1;
  });

  // Convert to percentages
  Object.keys(distribution).forEach(type => {
    distribution[type] = {
      count: distribution[type],
      percentage: (distribution[type] / total) * 100
    };
  });

  return distribution;
}

function calculateTopEntities(data) {
  const entityCounts = {};

  // Count tenders for each entity
  [...data.concursos_abertos, ...data.concursos_adjudicados, ...data.ajustes_diretos].forEach(tender => {
    entityCounts[tender.ugea] = (entityCounts[tender.ugea] || 0) + 1;
  });

  // Convert to array and sort
  return Object.entries(entityCounts)
    .map(([entity, count]) => ({ entity, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function calculateAverageDaysUntilOpening(tenders) {
  const daysArray = tenders.map(tender => {
    const launch = parseISO(tender.data_lancamento);
    const opening = parseISO(tender.data_abertura);
    return differenceInDays(opening, launch);
  });

  const sum = daysArray.reduce((acc, days) => acc + days, 0);
  return daysArray.length > 0 ? Math.round(sum / daysArray.length) : 0;
}

export function calculateDashboardStats(data) {
  // Get current and previous month data
  const currentMonth = new Date();
  const previousMonth = subMonths(currentMonth, 1);

  const currentMonthStart = startOfMonth(currentMonth);
  const currentMonthEnd = endOfMonth(currentMonth);
  const previousMonthStart = startOfMonth(previousMonth);
  const previousMonthEnd = endOfMonth(previousMonth);

  // Calculate current month counts
  const currentMonthCounts = {
    open: data.concursos_abertos.filter(tender => 
      isWithinInterval(parseISO(tender.data_lancamento), 
      { start: currentMonthStart, end: currentMonthEnd })
    ).length,
    awarded: data.concursos_adjudicados.filter(tender => 
      isWithinInterval(parseISO(tender.data_adjudicacao), 
      { start: currentMonthStart, end: currentMonthEnd })
    ).length,
    direct: data.ajustes_diretos.filter(tender => 
      isWithinInterval(parseISO(tender.data), 
      { start: currentMonthStart, end: currentMonthEnd })
    ).length
  };

  // Calculate previous month counts
  const previousMonthCounts = {
    open: data.concursos_abertos.filter(tender => 
      isWithinInterval(parseISO(tender.data_lancamento), 
      { start: previousMonthStart, end: previousMonthEnd })
    ).length,
    awarded: data.concursos_adjudicados.filter(tender => 
      isWithinInterval(parseISO(tender.data_adjudicacao), 
      { start: previousMonthStart, end: previousMonthEnd })
    ).length,
    direct: data.ajustes_diretos.filter(tender => 
      isWithinInterval(parseISO(tender.data), 
      { start: previousMonthStart, end: previousMonthEnd })
    ).length
  };

  // Calculate total value of direct adjustments
  const totalDirectAdjustmentsValue = data.ajustes_diretos.reduce((sum, adj) => sum + adj.valor, 0);
  const averageDirectAdjustmentValue = data.ajustes_diretos.length > 0 ? 
    totalDirectAdjustmentsValue / data.ajustes_diretos.length : 0;

  return {
    primary_metrics: {
      total_open_tenders: data.concursos_abertos.length,
      total_awarded_tenders: data.concursos_adjudicados.length,
      total_direct_adjustments: data.ajustes_diretos.length,
      total_direct_adjustments_value: totalDirectAdjustmentsValue,
      growth_rates: {
        open_tenders: calculateGrowthRate(currentMonthCounts.open, previousMonthCounts.open),
        awarded_tenders: calculateGrowthRate(currentMonthCounts.awarded, previousMonthCounts.awarded),
        direct_adjustments: calculateGrowthRate(currentMonthCounts.direct, previousMonthCounts.direct)
      }
    },
    secondary_metrics: {
      unique_entities: new Set([
        ...data.concursos_abertos.map(t => t.ugea),
        ...data.concursos_adjudicados.map(t => t.ugea),
        ...data.ajustes_diretos.map(t => t.ugea)
      ]).size,
      unique_provinces: new Set(data.concursos_abertos.map(t => t.provincia)).size,
      average_direct_adjustment_value: averageDirectAdjustmentValue,
      average_days_until_opening: calculateAverageDaysUntilOpening(data.concursos_abertos)
    },
    distribution_metrics: {
      province_distribution: calculateProvinceDistribution(data.concursos_abertos),
      tender_type_distribution: calculateTenderTypeDistribution(data.concursos_abertos),
      value_distribution: calculateValueDistribution(data.ajustes_diretos)
    },
    time_based_analytics: {
      monthly_trends: calculateMonthlyTrends(data)
    },
    entity_analytics: {
      top_entities: calculateTopEntities(data)
    },
    recent_activity: {
      recent_awards: data.concursos_adjudicados
        .sort((a, b) => new Date(b.data_adjudicacao) - new Date(a.data_adjudicacao))
        .slice(0, 5)
    },
    period_comparisons: {
      current_month: currentMonthCounts,
      previous_month: previousMonthCounts
    }
  };
}