import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';


@Component({
  selector: 'app-task-detail-dialog',
  standalone: true,
  imports: [MatDialogModule], 
  templateUrl: './task-detail-dialog.component.html',
  styleUrls: ['./task-detail-dialog.component.css']
})
export class TaskDetailDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { task_id: string; status: string; error_message: string; error_trace: string }) {}
}
