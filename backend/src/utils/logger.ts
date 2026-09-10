export class Logger {
  static info(message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO]: ${message}`, meta ? JSON.stringify(meta) : "");
  }

  static warn(message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN]: ${message}`, meta ? JSON.stringify(meta) : "");
  }

  static error(message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR]: ${message}`, meta ? JSON.stringify(meta) : "");
  }

  static debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== "production") {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG]: ${message}`, meta ? JSON.stringify(meta) : "");
    }
  }
}
