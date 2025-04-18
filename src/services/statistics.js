import { differenceInDays, addDays, subMonths, parseISO, isWithinInterval, startOfMonth, endOfMonth, isFuture, isAfter, isBefore, format } from 'date-fns';

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
      ).length
    };

    trends.push(monthData);
  }

  return trends.reverse();
}

function calculateGrowthRate(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number(((current - previous) / previous * 100).toFixed(1));
}

// Removed value distribution function as it was for direct adjustments

function calculateProvinceDistribution(tenders) {
  const distribution = {};
  const total = tenders.length;

  tenders.forEach(tender => {
    distribution[tender.provincia] = (distribution[tender.provincia] || 0) + 1;
  });

  // Convert to percentages and round to 1 decimal
  Object.keys(distribution).forEach(province => {
    distribution[province] = {
      count: distribution[province],
      percentage: Number(((distribution[province] / total) * 100).toFixed(1))
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

  // Convert to percentages and round to 1 decimal
  Object.keys(distribution).forEach(type => {
    distribution[type] = {
      count: distribution[type],
      percentage: Number(((distribution[type] / total) * 100).toFixed(1))
    };
  });

  return distribution;
}

function calculateTopEntities(data) {
  const entityCounts = {};

  // Count tenders for each entity (only open tenders)
  data.concursos_abertos.forEach(tender => {
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
  }).filter(days => !isNaN(days) && days > 0); // Filter out invalid values

  const sum = daysArray.reduce((acc, days) => acc + days, 0);
  return daysArray.length > 0 ? Math.round(sum / daysArray.length) : 0;
}

function calculateTimeToOpeningDistribution(tenders) {
  const now = new Date();
  const distribution = {
    'already_opened': 0,
    '1-7_days': 0,
    '8-14_days': 0,
    '15-30_days': 0,
    'more_than_30_days': 0
  };

  tenders.forEach(tender => {
    try {
      const opening = parseISO(tender.data_abertura);

      if (isBefore(opening, now)) {
        distribution.already_opened++;
      } else {
        const daysUntilOpening = differenceInDays(opening, now);

        if (daysUntilOpening <= 7) {
          distribution['1-7_days']++;
        } else if (daysUntilOpening <= 14) {
          distribution['8-14_days']++;
        } else if (daysUntilOpening <= 30) {
          distribution['15-30_days']++;
        } else {
          distribution.more_than_30_days++;
        }
      }
    } catch (error) {
      // Skip tenders with invalid dates
    }
  });

  return distribution;
}

function calculateUpcomingTenders(tenders) {
  const now = new Date();
  const next7Days = addDays(now, 7);
  const next14Days = addDays(now, 14);
  const next30Days = addDays(now, 30);

  return {
    next_7_days: tenders.filter(tender => {
      try {
        const opening = parseISO(tender.data_abertura);
        return isAfter(opening, now) && isBefore(opening, next7Days);
      } catch (error) {
        return false;
      }
    }).length,
    next_14_days: tenders.filter(tender => {
      try {
        const opening = parseISO(tender.data_abertura);
        return isAfter(opening, now) && isBefore(opening, next14Days);
      } catch (error) {
        return false;
      }
    }).length,
    next_30_days: tenders.filter(tender => {
      try {
        const opening = parseISO(tender.data_abertura);
        return isAfter(opening, now) && isBefore(opening, next30Days);
      } catch (error) {
        return false;
      }
    }).length
  };
}

function extractCommonKeywords(tenders, minOccurrences = 3) {
  // Extract words from tender objects
  const allWords = tenders.flatMap(tender => {
    const words = tender.objeto.toLowerCase()
      .replace(/[^\w\sáàâãéèêíìîóòôõúùûç]/g, '') // Keep accented characters
      .split(/\s+/)
      .filter(word => word.length > 3); // Only words longer than 3 characters
    return words;
  });

  // Count occurrences
  const wordCounts = {};
  allWords.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  // Filter by minimum occurrences and sort by frequency
  return Object.entries(wordCounts)
    .filter(([_, count]) => count >= minOccurrences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20) // Top 20 keywords
    .map(([word, count]) => ({ word, count }));
}

function calculateTenderTypesTrend(tenders, months = 6) {
  const now = new Date();
  const trends = [];

  // Get all unique tender types
  const tenderTypes = [...new Set(tenders.map(t => t.tipo_concurso))];

  for (let i = 0; i < months; i++) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));

    const monthData = {
      month: monthStart.toISOString().slice(0, 7)
    };

    // Calculate count for each tender type in this month
    tenderTypes.forEach(type => {
      monthData[type] = tenders.filter(tender =>
        tender.tipo_concurso === type &&
        isWithinInterval(parseISO(tender.data_lancamento), { start: monthStart, end: monthEnd })
      ).length;
    });

    trends.push(monthData);
  }

  return trends.reverse();
}

function getRecentTenders(tenders, count = 5) {
  return tenders
    .sort((a, b) => {
      try {
        return new Date(b.data_lancamento) - new Date(a.data_lancamento);
      } catch (error) {
        return 0;
      }
    })
    .slice(0, count)
    .map(tender => ({
      referencia: tender.referencia,
      objeto: tender.objeto,
      ugea: tender.ugea,
      provincia: tender.provincia,
      data_lancamento: tender.data_lancamento,
      data_abertura: tender.data_abertura
    }));
}

function calculateGeographicalInsights(tenders) {
  const provinces = {};

  // Group tenders by province
  tenders.forEach(tender => {
    if (!provinces[tender.provincia]) {
      provinces[tender.provincia] = [];
    }
    provinces[tender.provincia].push(tender);
  });

  // Calculate insights for each province
  const insights = {};

  Object.entries(provinces).forEach(([province, provinceTenders]) => {
    insights[province] = {
      count: provinceTenders.length,
      percentage: Number(((provinceTenders.length / tenders.length) * 100).toFixed(1)),
      types: {}
    };

    // Calculate tender type distribution within this province
    provinceTenders.forEach(tender => {
      insights[province].types[tender.tipo_concurso] =
        (insights[province].types[tender.tipo_concurso] || 0) + 1;
    });

    // Convert counts to percentages
    Object.keys(insights[province].types).forEach(type => {
      insights[province].types[type] = {
        count: insights[province].types[type],
        percentage: Number(((insights[province].types[type] / provinceTenders.length) * 100).toFixed(1))
      };
    });
  });

  return insights;
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
    ).length
  };

  // Calculate previous month counts
  const previousMonthCounts = {
    open: data.concursos_abertos.filter(tender =>
      isWithinInterval(parseISO(tender.data_lancamento),
        { start: previousMonthStart, end: previousMonthEnd })
    ).length
  };

  // Get today's date for upcoming tenders calculation
  const today = new Date();
  const formattedDate = format(today, 'yyyy-MM-dd');

  return {
    meta: {
      generated_at: new Date().toISOString(),
      current_date: formattedDate,
      data_source: {
        total_tenders_analyzed: data.concursos_abertos.length
      }
    },
    primary_metrics: {
      total_open_tenders: data.concursos_abertos.length,
      growth_rates: {
        open_tenders: calculateGrowthRate(currentMonthCounts.open, previousMonthCounts.open)
      },
      upcoming_tenders: calculateUpcomingTenders(data.concursos_abertos)
    },
    secondary_metrics: {
      unique_entities: new Set(data.concursos_abertos.map(t => t.ugea)).size,
      unique_provinces: new Set(data.concursos_abertos.map(t => t.provincia)).size,
      average_days_until_opening: calculateAverageDaysUntilOpening(data.concursos_abertos),
      time_to_opening_distribution: calculateTimeToOpeningDistribution(data.concursos_abertos)
    },
    distribution_metrics: {
      province_distribution: calculateProvinceDistribution(data.concursos_abertos),
      tender_type_distribution: calculateTenderTypeDistribution(data.concursos_abertos)
    },
    time_based_analytics: {
      monthly_trends: calculateMonthlyTrends(data),
      tender_types_trend: calculateTenderTypesTrend(data.concursos_abertos)
    },
    entity_analytics: {
      top_entities: calculateTopEntities(data)
    },
    geographical_insights: calculateGeographicalInsights(data.concursos_abertos),
    content_analytics: {
      common_keywords: extractCommonKeywords(data.concursos_abertos)
    },
    recent_tenders: getRecentTenders(data.concursos_abertos),
    period_comparisons: {
      current_month: currentMonthCounts,
      previous_month: previousMonthCounts
    }
  };
}