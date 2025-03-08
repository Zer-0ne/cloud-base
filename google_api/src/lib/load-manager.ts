export class LoadManager {
    private maxConcurrency: number;
    private activeTasks: number; // Count of currently active tasks
    private queue: (() => Promise<void>)[]; // Task queue

    constructor(maxConcurrency: number = 50) {
        this.maxConcurrency = maxConcurrency;
        this.activeTasks = 0;
        this.queue = [];
    }

    /**
     * Adds a task for execution while respecting concurrency limits.
     * @param task - The task function returning a promise.
     * @returns The result of the task.
     */
    async addTask<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const runTask = async () => {
                this.activeTasks++;
                try {
                    const result = await task(); // Execute the task
                    resolve(result); // Resolve the promise with the task result
                } catch (error) {
                    reject(error); // Reject the promise if the task fails
                } finally {
                    this.activeTasks--;
                    this.processQueue(); // Check the queue for the next task
                }
            };

            if (this.activeTasks < this.maxConcurrency) {
                runTask(); // Run the task immediately if concurrency allows
            } else {
                this.queue.push(runTask); // Otherwise, add the task to the queue
            }
        });
    }

    /**
     * Processes the next task in the queue if concurrency limits allow.
     */
    private processQueue() {
        if (this.activeTasks < this.maxConcurrency && this.queue.length > 0) {
            const nextTask = this.queue.shift();
            if (nextTask) nextTask(); // Execute the next task in the queue
        }
    }

    /**
     * Ensures all tasks (active and queued) are completed.
     */
    async waitForAllTasks(): Promise<void> {
        while (this.activeTasks > 0 || this.queue.length > 0) {
            await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay to wait for tasks to complete
        }
    }
}
export const loadManager = new LoadManager(20);