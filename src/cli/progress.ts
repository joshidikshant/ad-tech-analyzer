import ora, { Ora } from 'ora';
import chalk from 'chalk';

export class AnalysisProgress {
  private spinner: Ora;
  private startTime: number;

  constructor() {
    this.spinner = ora();
    this.startTime = 0;
  }

  start(message: string): void {
    this.startTime = Date.now();
    this.spinner.start(chalk.cyan(message));
  }

  update(message: string): void {
    this.spinner.text = chalk.cyan(message);
  }

  succeed(message?: string): void {
    const elapsed = this.getElapsedTime();
    const finalMessage = message
      ? `${message} ${chalk.gray(`(${elapsed})`)}`
      : `Done ${chalk.gray(`(${elapsed})`)}`;
    this.spinner.succeed(chalk.green(finalMessage));
  }

  fail(message: string): void {
    const elapsed = this.getElapsedTime();
    this.spinner.fail(chalk.red(`${message} ${chalk.gray(`(${elapsed})`)}`));
  }

  warn(message: string): void {
    this.spinner.warn(chalk.yellow(message));
  }

  info(message: string): void {
    this.spinner.info(chalk.blue(message));
  }

  stop(): void {
    this.spinner.stop();
  }

  private getElapsedTime(): string {
    const elapsed = Date.now() - this.startTime;
    if (elapsed < 1000) {
      return `${elapsed}ms`;
    }
    const seconds = Math.floor(elapsed / 1000);
    const ms = elapsed % 1000;
    if (seconds < 60) {
      return `${seconds}.${Math.floor(ms / 100)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

export enum AnalysisPhase {
  CONNECTING = 'Connecting to Chrome DevTools...',
  NAVIGATING = 'Navigating to page...',
  LOADING = 'Waiting for page load...',
  CAPTURING = 'Capturing network requests...',
  QUERYING = 'Querying ad-tech APIs...',
  CLASSIFYING = 'Classifying vendors...',
  ANALYZING = 'Analyzing configuration...',
  FINALIZING = 'Compiling analysis...',
}
