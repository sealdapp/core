"use strict";

const winston = require('winston');

module.exports = function(env){
    
    /// Custom format to include file name and line number
    const logFormat = winston.format.printf(({ level, message, timestamp }) => {

        /// Structure the format of the logs
        return `${timestamp} [${level.toUpperCase()}] : ${message}`;
    });
    
    /// Create a Winston logger
    return winston.createLogger({
        level: env.LOG_LEVEL,
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            logFormat
        ),
        transports: [
            new winston.transports.Console()
        ],
    });
    
}