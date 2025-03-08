'use server'
import { getCurrentDateTime } from "./Date";
import DailyRotateFile from 'winston-daily-rotate-file'
import { createLogger, format, transports } from 'winston'


type Color =
    | 'defaultColor'
    | 'black'
    | 'red'
    | 'green'
    | 'yellow'
    | 'blue'
    | 'magenta'
    | 'cyan'
    | 'white'
    | 'gray'
    | 'brightRed'
    | 'brightGreen'
    | 'brightYellow'
    | 'brightBlue'
    | 'brightMagenta'
    | 'brightCyan'
    | 'brightWhite'
    | 'bgBlack'
    | 'bgRed'
    | 'bgGreen'
    | 'bgYellow'
    | 'bgBlue'
    | 'bgMagenta'
    | 'bgCyan'
    | 'bgWhite'
    | 'bgGray'
    | 'bgBrightRed'
    | 'bgBrightGreen'
    | 'bgBrightYellow'
    | 'bgBrightBlue'
    | 'bgBrightMagenta'
    | 'bgBrightCyan'
    | 'bgBrightWhite';

const colors: Record<Color, string> = {
    // Font Colors
    defaultColor: '\x1b[0m',       // Reset
    black: '\x1b[30m',            // Black
    red: '\x1b[31m',              // Red
    green: '\x1b[32m',            // Green
    yellow: '\x1b[33m',           // Yellow
    blue: '\x1b[34m',             // Blue
    magenta: '\x1b[35m',          // Magenta
    cyan: '\x1b[36m',             // Cyan
    white: '\x1b[37m',            // White
    gray: '\x1b[90m',             // Gray
    brightRed: '\x1b[91m',        // Bright Red
    brightGreen: '\x1b[92m',      // Bright Green
    brightYellow: '\x1b[93m',     // Bright Yellow
    brightBlue: '\x1b[94m',       // Bright Blue
    brightMagenta: '\x1b[95m',    // Bright Magenta
    brightCyan: '\x1b[96m',       // Bright Cyan
    brightWhite: '\x1b[97m',      // Bright White

    // Background Colors
    bgBlack: '\x1b[40m',          // Background Black
    bgRed: '\x1b[41m',            // Background Red
    bgGreen: '\x1b[42m',          // Background Green
    bgYellow: '\x1b[43m',         // Background Yellow
    bgBlue: '\x1b[44m',           // Background Blue
    bgMagenta: '\x1b[45m',        // Background Magenta
    bgCyan: '\x1b[46m',           // Background Cyan
    bgWhite: '\x1b[47m',          // Background White
    bgGray: '\x1b[100m',          // Background Gray
    bgBrightRed: '\x1b[101m',     // Background Bright Red
    bgBrightGreen: '\x1b[102m',   // Background Bright Green
    bgBrightYellow: '\x1b[103m',  // Background Bright Yellow
    bgBrightBlue: '\x1b[104m',    // Background Bright Blue
    bgBrightMagenta: '\x1b[105m', // Background Bright Magenta
    bgBrightCyan: '\x1b[106m',    // Background Bright Cyan
    bgBrightWhite: '\x1b[107m'    // Background Bright White
};

function getFormattedDate(): string {
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    };
    const date = new Date();
    return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
}

export async function print(
    message: string,
    fontColor: Color = 'defaultColor',
    bgColor: Color = 'defaultColor',
    level: 'info' | 'warn' | 'error' = 'info',
) {
    const fontColorCode = colors[fontColor] || colors.defaultColor; // Default if invalid font color
    const bgColorCode = colors[bgColor] || colors.defaultColor;     // Default if invalid background color

    if (fontColor === 'red') {
        level = 'error'
    }
    if (fontColor === 'yellow') {
        level = 'warn'
    }

    const currentTime = getCurrentDateTime()
    const transport = new DailyRotateFile({
        filename: 'logs/log-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '10m',
        maxFiles: '14d',
    })

    // Create the logger
    const logger = createLogger({
        level: 'info',
        format: format.combine(
            format.timestamp(),
            format.printf((info) => {
                // Format the log message
                return `[${currentTime}] ${info.level}: ${info.message}`;
            })
        ),
        transports: [
            transport,
            new transports.Console({
                format: format.combine(
                    format.colorize(),
                    format.printf((info) => {
                        // Customize console output based on log level
                        let color;
                        switch (info.level) {
                            case 'error':
                                color = colors.red;
                                break;
                            case 'warn':
                                color = colors.yellow;
                                break;
                            case 'info':
                            default:
                                color = colors.green;
                                break;
                        }
                        return `[${currentTime}]: ${bgColorCode}${fontColorCode}${message}${colors.defaultColor}`;
                    })
                )
            })
        ],
    });

    // Log the message based on the level
    switch (level) {
        case 'error':
            logger.error(message);
            break;
        case 'warn':
            logger.warn(message);
            break;
        case 'info':
        default:
            logger.info(message);
            break;
    }
    // // loadManager.addTask(async () => {
    // console.log(`[${currentTime}]: ${bgColorCode}${fontColorCode}${message}${colors.defaultColor}`);
    // })
}