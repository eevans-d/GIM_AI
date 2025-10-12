/**
 * Mock para Bull Queue
 */

class MockQueue {
  constructor(name, redisUrl, options = {}) {
    this.name = name;
    this.redisUrl = redisUrl;
    this.options = options;
    this.jobs = [];
    this.processors = [];
    
    console.log(`[MOCK] Bull Queue created: ${name}`);
  }

  async add(jobType, data, options = {}) {
    const job = {
      id: Math.random().toString(36).substr(2, 9),
      type: jobType,
      data,
      options,
      timestamp: new Date().toISOString()
    };
    
    this.jobs.push(job);
    console.log(`[MOCK] Job added to queue ${this.name}:`, job.id);
    
    return job;
  }

  process(concurrency, processor) {
    if (typeof concurrency === 'function') {
      processor = concurrency;
      concurrency = 1;
    }
    
    this.processors.push({ concurrency, processor });
    console.log(`[MOCK] Processor registered for queue ${this.name}`);
    
    return this;
  }

  async close() {
    console.log(`[MOCK] Queue ${this.name} closed`);
    return Promise.resolve();
  }

  async empty() {
    this.jobs = [];
    console.log(`[MOCK] Queue ${this.name} emptied`);
    return Promise.resolve();
  }

  async getJobCounts() {
    return {
      active: 0,
      completed: this.jobs.length,
      failed: 0,
      delayed: 0,
      waiting: 0
    };
  }

  // NUEVOS MÉTODOS PARA INTEGRATION TESTS
  async getJobs(types = ['waiting', 'active', 'completed']) {
    return this.jobs.filter(job => {
      // Simular diferentes estados
      if (types.includes('waiting')) return true;
      if (types.includes('completed')) return job.completed;
      if (types.includes('failed')) return job.failed;
      return true;
    });
  }

  async getWaiting() {
    return this.jobs.filter(job => !job.completed && !job.failed);
  }

  async getFailed() {
    return this.jobs.filter(job => job.failed);
  }

  async getCompleted() {
    return this.jobs.filter(job => job.completed);
  }

  async clean(grace, status) {
    const initialLength = this.jobs.length;
    // Simular limpieza basada en estado
    if (status === 'completed') {
      this.jobs = this.jobs.filter(job => !job.completed);
    } else if (status === 'failed') {
      this.jobs = this.jobs.filter(job => !job.failed);
    }
    const cleaned = initialLength - this.jobs.length;
    console.log(`[MOCK] Queue ${this.name} cleaned ${cleaned} ${status} jobs`);
    return cleaned;
  }

  // Simular fallos para testing
  simulateFailure(jobId) {
    const job = this.jobs.find(j => j.id === jobId);
    if (job) {
      job.failed = true;
      job.failedReason = 'Simulated failure';
    }
  }

  // Simular completado para testing
  simulateCompletion(jobId) {
    const job = this.jobs.find(j => j.id === jobId);
    if (job) {
      job.completed = true;
    }
  }

  on(event, handler) {
    console.log(`[MOCK] Event listener registered for ${event} on queue ${this.name}`);
    return this;
  }

  off(event, handler) {
    console.log(`[MOCK] Event listener removed for ${event} on queue ${this.name}`);
    return this;
  }
}

module.exports = MockQueue;