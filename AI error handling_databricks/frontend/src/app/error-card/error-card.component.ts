import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-card',
  standalone: true,
  imports: [MatCardModule, MatButtonModule,CommonModule],
  templateUrl: './error-card.component.html',
  styleUrls: ['./error-card.component.css']
})
export class ErrorCardComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { error_traces: { task_run_id: number; error_trace: string }[] },
    public dialogRef: MatDialogRef<ErrorCardComponent>
  ) { }
}
