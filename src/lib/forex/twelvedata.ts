import axios from 'axios'

const BASE_URL = 'https://api.twelvedata.com'

/** Fetch current price for a forex pair */
export async function getForexPrice(pair: string): Promise<{
  price: number
  timestamp: string
} | null> {
  try {
    const symbol = pair.replace('/', '')
    const { data } = await axios.get(`${BASE_URL}/price`, {
      params: {
        symbol: `${symbol}`,
        apikey: process.env.TWELVE_DATA_API_KEY,
      },
    })
    if (data.price) {
      return { price: parseFloat(data.price), timestamp: new Date().toISOString() }
    }
    return null
  } catch {
    return null
  }
}

/** Fetch time series for sparkline data */
export async function getForexTimeSeries(
  pair: string,
  interval = '1h',
  outputSize = 24
): Promise<number[]> {
  try {
    const symbol = pair.replace('/', '')
    const { data } = await axios.get(`${BASE_URL}/time_series`, {
      params: {
        symbol,
        interval,
        outputsize: outputSize,
        apikey: process.env.TWELVE_DATA_API_KEY,
      },
    })
    if (data.values) {
      return data.values
        .map((v: { close: string }) => parseFloat(v.close))
        .reverse()
    }
    return []
  } catch {
    return []
  }
}

/** Major forex pairs to track */
export const MAJOR_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
  'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP',
  'EUR/JPY', 'GBP/JPY',
]
