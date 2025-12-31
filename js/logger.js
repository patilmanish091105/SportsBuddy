

class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100; // Limit stored logs to prevent memory issues
        this.loadPersistedLogs();
    }

    
    loadPersistedLogs() {
        try {
            const stored = localStorage.getItem('app_logs');
            if (stored) {
                this.logs = JSON.parse(stored);
                if (this.logs.length > this.maxLogs) {
                    this.logs = this.logs.slice(-this.maxLogs);
                }
            }
        } catch (error) {
            console.error('Failed to load persisted logs:', error);
            this.logs = [];
        }
    }

   
    persist() {
        try {
            const logsToStore = this.logs.slice(-this.maxLogs);
            localStorage.setItem('app_logs', JSON.stringify(logsToStore));
        } catch (error) {
            console.error('Failed to persist logs:', error);
        }
    }

    /**
     * Core logging method
     * @param {string} level - Log level (info, success, warning, error)
     * @param {string} message - Log message
     * @param {object} meta - Additional metadata
     */
    log(level, message, meta = {}) {
        const entry = {
            level,
            message,
            meta,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        this.logs.push(entry);
        this.persist();

        const emoji = this.getLevelEmoji(level);
        const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
        
        console[consoleMethod](
            `${emoji} [${level.toUpperCase()}]`,
            message,
            meta && Object.keys(meta).length > 0 ? meta : ''
        );
    }

    
    getLevelEmoji(level) {
        const emojis = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return emojis[level] || '📝';
    }

    
    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    
    success(message, meta = {}) {
        this.log('success', message, meta);
    }

    
    warning(message, meta = {}) {
        this.log('warning', message, meta);
    }

    
    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    
    getLogs() {
        return this.logs;
    }

    
    clearLogs() {
        this.logs = [];
        try {
            localStorage.removeItem('app_logs');
            console.log('🧹 Logs cleared successfully');
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }

    
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
}

const logger = new Logger();

window.logger = logger;

export default logger;