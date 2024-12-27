import { Component, OnInit, ElementRef, ViewChildren, ViewChild, QueryList, HostListener, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { TaskDetailDialogComponent } from '../task-detail-dialog/task-detail-dialog.component';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ErrorCardComponent } from '../error-card/error-card.component';
import { FormsModule } from '@angular/forms';  
import { HttpClientModule } from '@angular/common/http';  
import { ChatbotComponent } from '../chatbot/chatbot.component';

interface Task {
  task_key: string;
  task_run_id: number;
  output: string;
  state: {
    result_state: string;
    state_message: string;
    error_trace: string;
  };
  // depends_on?: { task_key: string }[]; // Add this line
}

interface ExampleData {
  status: string;
  run_id: number;
  result_state: string;
  task_logs: Task[];
}

interface ErrorDetail {
  error_code: string;
  error_message: string;
  solution: string;
}

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return [];
  }
  return [value];
}

function processExampleData(data: any): ExampleData {
  const taskLogs: Task[] = ensureArray(data.task_logs).map((log: any) => ({
    task_key: log.task_key,
    task_run_id: log.task_run_id,
    output: log.output,
    state: {
      result_state: log.state.result_state,
      state_message: log.state.state_message,
      error_trace: log.state.error_trace
    },
  }));

  return {
    status: data.status,
    run_id: data.run_id,
    result_state: data.result_state,
    task_logs: taskLogs
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, FormsModule, HttpClientModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  jobId: string = '';
  dashboardCards: { title: string, task: Task }[] = [];
  isColorChanged = false;
  dagStatus: string = '';
  retryButtonClicked = false;
  showAlert = false;
  showFixInfo = false;
  errorDetails: ErrorDetail[] = [];
  solutionsForFailedTasks: { task_id: string, solution: string }[] = [];
  selectedErrorTraces: { task_run_id: number; error_trace: string }[] = [];
  result: any;
  isRetryEnabled: boolean = false; 

  @ViewChild('dynamicComponentContainer', { read: ViewContainerRef }) container!: ViewContainerRef; 
  @ViewChildren('card') cardElements!: QueryList<ElementRef>;

  constructor(private http: HttpClient, private dialog: MatDialog) { }

  ngOnInit() {
    this.loadErrorDetails();
    this.fetchData().subscribe((data: ExampleData) => {
      if (data) {
        this.dagStatus = data.result_state;
        const taskLogs = ensureArray(data.task_logs);
        this.dashboardCards = taskLogs.map((taskLog: Task) => ({
          title: taskLog.task_key,
          task: taskLog
        }));
        this.updateFailedTasksSolutions(taskLogs);

        // const dependencies = this.extractDependencies(taskLogs);
        // console.log('Dependencies:', dependencies);

        // const result = this.checkDependency("t3", dependencies);
        // console.log('Dependency Check Result:', result);
      }
    });
  }

  loadCheckFixComponent() {
    this.container.clear(); // Clear previous components
    this.container.createComponent(ChatbotComponent); // Directly create the component
  }

  fetchData(): Observable<ExampleData> {
    return this.http.get<any>('assets/data/dummy.json').pipe(
      map(data => processExampleData(data))
    );
  }

  // extractDependencies(taskLogs: Task[]): string[] {
  //   const dependencyStructure: string[] = [];

  //   for (const task of taskLogs) {
  //     const taskKey = task.task_key;
  //     if (task.depends_on) {
  //       for (const dependency of task.depends_on) {
  //         const dependencyKey = dependency.task_key;
  //         dependencyStructure.push(`${dependencyKey}->${taskKey}`);
  //       }
  //     }
  //   }

  //   return dependencyStructure;
  // }
  checkPath(): void {
    const taskKey = "t3"; 
    const staticDependencies = [
      't2->t3',
      't1->t2',
      't4->t5',
      't3->t5',
      't2->t4'
    ];
    const result = this.checkDependency(taskKey, staticDependencies);
  
    this.isRetryEnabled = result === true;
  }
  

  checkDependency(taskKey: string, dependencyList: string[]): string | boolean {
    const sourceDependencies: string[] = [];
    const targetDependencies: string[] = [];

    for (const dependency of dependencyList) {
      const [source, target] = dependency.split('->');
      if (target === taskKey) {
        sourceDependencies.push(source);
      }
      if (source === taskKey) {
        targetDependencies.push(target);
      }
    }

    if (sourceDependencies.length === 0 || targetDependencies.length === 0) {
      return "No retries allowed";
    }

    const sourceTask = sourceDependencies[0];
    const sourceOtherDependencies: string[] = [];
    for (const dependency of dependencyList) {
      const [source, target] = dependency.split('->');
      if (source === sourceTask && target !== taskKey) {
        sourceOtherDependencies.push(target);
      }
    }

    if (sourceOtherDependencies.length === 0) {
      return "No retries allowed";
    }

    const targetTask = targetDependencies[0];
    const targetOtherDependencies: string[] = [];
    for (const dependency of dependencyList) {
      const [source, target] = dependency.split('->');
      if (target === targetTask && source !== taskKey) {
        targetOtherDependencies.push(source);
      }
    }

    return sourceOtherDependencies.length > 0 && targetOtherDependencies.length > 0;
  }
  retryWorkflow(): void {
    this.http.get('assets/data/dummy.json').subscribe({
      next: (jsonData: any) => {
        const job_id = jsonData.run_id; 
        const failedTask = jsonData.task_logs.find((task: Task) => task.state.result_state === "FAILED");

        if (failedTask) {
          const task_key = failedTask.task_key; 

          const payload = {
            job_id: job_id, 
            task_key: task_key 
          };

          this.http.post('/workflow/remove-task', payload).subscribe({
            next: (response) => {
              console.log('Retry response:', response);
            },
            error: (error) => {
              console.error('Error during retry:', error);
            }
          });
        } else {
          console.error('No failed task found.');
        }
      },
      error: (error) => {
        console.error('Error reading JSON file:', error);
      }
    });
  }

  handleSubmit(event: Event) {
    event.preventDefault();

    const jobId = (document.getElementById('jobId') as HTMLInputElement).value;

    if (jobId) {
      window.location.href = `http://127.0.0.1:5000/workflow/execute?job_id=${jobId}`;
    } else {
      alert('Please enter a Job ID.');
    }
  }

  loadErrorDetails() {
    this.http.get<ErrorDetail[]>('assets/data/errors.json').subscribe((data) => {
      this.errorDetails = ensureArray(data);
    });
  }

  updateFailedTasksSolutions(taskLogs: Task[]) {
    if (!Array.isArray(this.errorDetails)) {
      return;
    }

    this.solutionsForFailedTasks = taskLogs
      .filter(taskLog => taskLog.state.result_state === 'FAILED')
      .map(taskLog => {
        const normalizedTaskError = normalizeString(taskLog.state.state_message);
        const errorDetail = this.errorDetails.find(error => normalizeString(error.error_message) === normalizedTaskError);
        return errorDetail
          ? { task_id: taskLog.task_key, solution: errorDetail.solution }
          : { task_id: taskLog.task_key, solution: 'No solution available' };
      });
  }

  getCardColor(status: string): string {
    switch (status) {
      case 'SUCCESS':
        return 'card-success';
      case 'FAILED':
        return 'card-failed';
      default:
        return '';
    }
  }

  openDialog(task: Task): void {
    this.dialog.open(TaskDetailDialogComponent, {
      data: {
        task_id: task.task_key,
        status: task.state.result_state
      }
    });
  }

  viewDetail(): void {
    const failedTaskLogs = this.dashboardCards
      .map(card => card.task)
      .filter(task => task.state.result_state === 'FAILED')
      .map(task => {
        const cleanedErrorTrace = this.cleanErrorTrace(task.state.error_trace);
        return {
          task_run_id: task.task_run_id,
          error_trace: cleanedErrorTrace
        };
      });
  
    this.selectedErrorTraces = failedTaskLogs.length > 0
      ? failedTaskLogs
      : [{ task_run_id: 0, error_trace: 'No error traces available.' }];
    this.openErrorCard();
  }
  
  private cleanErrorTrace(errorTrace: string): string {
    const ansiEscapeCodeRegex = /\x1b\[[0-9;]*m/g;
    const nonEnglishRegex = /[^a-zA-Z\s:]/g;
    
    let cleanedTrace = errorTrace
      .replace(ansiEscapeCodeRegex, '')
      .replace(nonEnglishRegex, '')
      .trim();
  
    const sentences = cleanedTrace.split(/(?<=\.)\s+/);
    return sentences.length > 0 ? sentences[sentences.length - 1] : 'No error traces available.';
  }
  
  openErrorCard(): void {
    this.dialog.open(ErrorCardComponent, {
      data: {
        error_traces: this.selectedErrorTraces
      }
    });
  }

  changeCardColors() {
    this.isColorChanged = true;
    this.flashCards();
  }

  flashCards() {
    const cards = this.cardElements.toArray();
    cards.forEach(card => {
      const element = card.nativeElement as HTMLElement;
      const color = element.classList.contains('card-success') ? '#33b150' : '#c43844';
      element.style.backgroundColor = color;
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const alertElement = document.querySelector('.alert') as HTMLElement;
    if (alertElement && !alertElement.contains(event.target as Node)) {
      this.hideAlert();
    }
  }

  hideAlert() {
    this.showAlert = false;
  }

  viewSol() {
    this.showFixInfo = !this.showFixInfo;
  }
}

function normalizeString(str: string): string {
  return str.trim().toLowerCase();
}
