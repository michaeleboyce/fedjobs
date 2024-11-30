export type ParseResponse = {
    status: 'pending',
    percent: number,
    message: string,
  } | {
    status : 'complete',
    percent: 100,
    message: string,
  } | { 
    status: 'error',
    percent: 0,
    message: string
  } | {
    status: 'ok',
    percent: 0,
    message: string
  }