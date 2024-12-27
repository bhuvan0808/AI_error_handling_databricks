import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { TaskDetailDialogComponent } from './task-detail-dialog/task-detail-dialog.component'; 
import { ErrorCardComponent } from './error-card/error-card.component';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';  // Import FormsModule


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    TaskDetailDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatDialogModule,
    MatCardModule,
    ErrorCardComponent,
    MatButtonModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule { }
