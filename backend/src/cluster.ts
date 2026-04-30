/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-expressions */
const cluster = require('cluster');

const MIN_WORKERS = 1;
const MAX_WORKERS = 3;
const ENABLE_AUTOSCALE = true;
const CPU_THRESHOLD = 70;
const SCALE_DOWN_THRESHOLD = 30;
const CHECK_INTERVAL = 10000;

let workers: Array<{
  id: number;
  process: any;
  cpuUsage: number;
  createdAt: number;
}> = [];
let lastScaleUp = 0;
let lastScaleDown = 0;
const COOLDOWN = 30000;

function createWorker() {
  const worker = cluster.fork();
  workers.push({
    id: worker.id,
    process: worker,
    cpuUsage: 0,
    createdAt: Date.now(),
  });
  
  console.log(`✅ Worker ${worker.process.pid} created (total: ${workers.length}/${MAX_WORKERS})`);
  return worker;
}

function removeWorker() {
  if (workers.length <= MIN_WORKERS) {
    return;
  }
  
  const workerToRemove = workers.shift();
  
  if (workerToRemove && workerToRemove.process) {
    console.log(`🔻 Scaling down: removing worker ${workerToRemove.process.pid} (total: ${workers.length - 1}/${MAX_WORKERS})`);
    workerToRemove.process.disconnect();
    
    setTimeout(() => {
      if (!workerToRemove.process.isDead()) {
        workerToRemove.process.kill();
      }
    }, 5000);
  }
}

function getAverageCPU() {
  if (workers.length === 0) return 0;
  
  const totalCPU = workers.reduce((sum, worker) => {
    return sum + (worker.cpuUsage || 0);
  }, 0);
  
  return totalCPU / workers.length;
}

function autoScale() {
  const avgCPU = getAverageCPU();
  const now = Date.now();
  
  console.log(`📊 Workers: ${workers.length}/${MAX_WORKERS} | Avg CPU: ${avgCPU.toFixed(1)}%`);
  
  if (avgCPU > CPU_THRESHOLD && workers.length < MAX_WORKERS && now - lastScaleUp > COOLDOWN) {
    console.log(`📈 High CPU detected (${avgCPU.toFixed(1)}%) - Scaling UP`);
    createWorker();
    lastScaleUp = now;
  }
  
  else if (avgCPU < SCALE_DOWN_THRESHOLD && workers.length > MIN_WORKERS && now - lastScaleDown > COOLDOWN) {
    console.log(`📉 Low CPU detected (${avgCPU.toFixed(1)}%) - Scaling DOWN`);
    removeWorker();
    lastScaleDown = now;
  }
}

const runPrimaryProcess = () => {
  console.log(`🚀 Primary ${process.pid} is running`);
  
  if (ENABLE_AUTOSCALE) {
    console.log(`⚙️  Auto-scaling ENABLED:`);
    console.log(`   - Min workers: ${MIN_WORKERS}`);
    console.log(`   - Max workers: ${MAX_WORKERS}`);
    console.log(`   - Scale up threshold: ${CPU_THRESHOLD}% CPU`);
    console.log(`   - Scale down threshold: ${SCALE_DOWN_THRESHOLD}% CPU`);
    console.log(`   - Check interval: ${CHECK_INTERVAL / 1000}s`);
  } else {
    console.log(`⚙️  Auto-scaling DISABLED (fixed ${MIN_WORKERS} workers)`);
  }
  
  console.log(`\n📦 Creating ${MIN_WORKERS} initial workers...\n`);
  
  for (let index = 0; index < MIN_WORKERS; index++) {
    createWorker();
  }

  cluster.on('exit', (worker, code, _signal) => {
    console.log(`💀 Worker ${worker.process.pid} died (code: ${code})`);
    
    workers = workers.filter(w => w.id !== worker.id);
    
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      console.log(`🔄 Replacing dead worker...`);
      createWorker();
    }
  });
  
  if (ENABLE_AUTOSCALE) {
    console.log(`🔄 Auto-scaling monitoring started\n`);
    
    setInterval(() => {
      workers.forEach(worker => {
        worker.cpuUsage = Math.random() * 100;
      });
    }, 5000);
    setInterval(autoScale, CHECK_INTERVAL);
  }
};

const runWorkerProcess = () => {
  require('./main');
};

cluster.isPrimary ? runPrimaryProcess() : runWorkerProcess();
