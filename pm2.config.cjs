module.exports = {
  apps: [{
    name: 'lark-application',
    script: './build/index.cjs',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/pm2_err.log',
    out_file: './logs/pm2_out.log',
    log_file: './logs/pm2_combined.log',
    log_type: 'json',
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_log_size: '20M'
  }]
};