/**
 * AI Brain: Sales Forecasting Engine
 * 
 * Features:
 * - 7-day moving average calculation
 * - Trend analysis and growth prediction
 * - Revenue forecasting for upcoming week
 * - Target vs predicted comparison
 * - Historical data analysis from ERPNext
 */

import type { ERPNextConfig } from './erpnext-api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailySalesData {
  date: string
  revenue: number
  transactions: number
  avg_basket_size: number
}

export interface SalesForecast {
  predicted_revenue: number
  confidence: number // 0-1
  trend: 'up' | 'down' | 'stable'
  growth_percentage: number
  daily_predictions: Array<{
    date: string
    predicted_revenue: number
  }>
}

export interface ForecastAnalysis {
  historical_data: DailySalesData[]
  moving_average_7d: number
  trend_slope: number
  forecast: SalesForecast
  target_revenue: number
  achievement_probability: number
}

// ─── Forecasting Engine ───────────────────────────────────────────────────────

export class SalesForecastingEngine {
  /**
   * Calculate 7-day moving average
   */
  static calculateMovingAverage(data: DailySalesData[], days = 7): number {
    if (data.length < days) {
      return data.reduce((sum, d) => sum + d.revenue, 0) / data.length
    }

    const recent = data.slice(-days)
    return recent.reduce((sum, d) => sum + d.revenue, 0) / days
  }

  /**
   * Calculate trend slope (linear regression)
   */
  static calculateTrendSlope(data: DailySalesData[]): number {
    if (data.length < 2) return 0

    const n = data.length
    const xValues = Array.from({ length: n }, (_, i) => i)
    const yValues = data.map(d => d.revenue)

    // Calculate means
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n

    // Calculate slope
    let numerator = 0
    let denominator = 0

    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean)
      denominator += Math.pow(xValues[i] - xMean, 2)
    }

    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * Generate sales forecast for next 7 days
   */
  static generateForecast(historicalData: DailySalesData[]): SalesForecast {
    if (historicalData.length === 0) {
      return {
        predicted_revenue: 0,
        confidence: 0,
        trend: 'stable',
        growth_percentage: 0,
        daily_predictions: [],
      }
    }

    const movingAvg = this.calculateMovingAverage(historicalData)
    const trendSlope = this.calculateTrendSlope(historicalData)
    
    // Calculate growth percentage
    const recentRevenue = historicalData.slice(-7).reduce((sum, d) => sum + d.revenue, 0)
    const previousRevenue = historicalData.slice(-14, -7).reduce((sum, d) => sum + d.revenue, 0) || recentRevenue
    const growthPercentage = previousRevenue > 0 
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0

    // Determine trend
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (trendSlope > movingAvg * 0.02) trend = 'up'
    else if (trendSlope < -movingAvg * 0.02) trend = 'down'

    // Generate daily predictions for next 7 days
    const dailyPredictions: Array<{ date: string; predicted_revenue: number }> = []
    const lastDate = new Date(historicalData[historicalData.length - 1].date)

    for (let i = 1; i <= 7; i++) {
      const predictedDate = new Date(lastDate)
      predictedDate.setDate(lastDate.getDate() + i)
      
      // Simple prediction: moving average + (trend * day offset)
      const predicted = Math.max(0, movingAvg + (trendSlope * i))
      
      dailyPredictions.push({
        date: predictedDate.toISOString().split('T')[0],
        predicted_revenue: predicted,
      })
    }

    const predicted_revenue = dailyPredictions.reduce((sum, d) => sum + d.predicted_revenue, 0)

    // Calculate confidence based on data consistency
    const recentVariance = this.calculateVariance(historicalData.slice(-7))
    const confidence = Math.max(0.5, Math.min(0.95, 1 - (recentVariance / movingAvg)))

    return {
      predicted_revenue,
      confidence,
      trend,
      growth_percentage: growthPercentage,
      daily_predictions: dailyPredictions,
    }
  }

  /**
   * Calculate variance of revenue data
   */
  private static calculateVariance(data: DailySalesData[]): number {
    if (data.length === 0) return 0

    const mean = data.reduce((sum, d) => sum + d.revenue, 0) / data.length
    const squaredDiffs = data.map(d => Math.pow(d.revenue - mean, 2))
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / data.length
  }

  /**
   * Fetch historical sales data from ERPNext
   */
  static async fetchHistoricalData(
    erpConfig: ERPNextConfig,
    days = 30
  ): Promise<DailySalesData[]> {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - days)

      const response = await fetch('/api/sales-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sales data')
      }

      const { data } = await response.json()
      return data as DailySalesData[]

    } catch (error) {
      console.error('[v0] Historical data fetch error:', error)
      return []
    }
  }

  /**
   * Generate complete forecast analysis
   */
  static async generateAnalysis(
    erpConfig: ERPNextConfig,
    targetRevenue: number
  ): Promise<ForecastAnalysis> {
    const historicalData = await this.fetchHistoricalData(erpConfig, 30)
    
    if (historicalData.length === 0) {
      return {
        historical_data: [],
        moving_average_7d: 0,
        trend_slope: 0,
        forecast: {
          predicted_revenue: 0,
          confidence: 0,
          trend: 'stable',
          growth_percentage: 0,
          daily_predictions: [],
        },
        target_revenue: targetRevenue,
        achievement_probability: 0,
      }
    }

    const movingAvg = this.calculateMovingAverage(historicalData)
    const trendSlope = this.calculateTrendSlope(historicalData)
    const forecast = this.generateForecast(historicalData)

    // Calculate achievement probability
    const achievementProbability = targetRevenue > 0
      ? Math.min(1, (forecast.predicted_revenue / targetRevenue) * forecast.confidence)
      : 0

    return {
      historical_data: historicalData,
      moving_average_7d: movingAvg,
      trend_slope: trendSlope,
      forecast,
      target_revenue: targetRevenue,
      achievement_probability: achievementProbability,
    }
  }
}

export default SalesForecastingEngine
