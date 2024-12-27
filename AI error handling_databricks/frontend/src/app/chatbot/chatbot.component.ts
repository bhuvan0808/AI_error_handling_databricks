import { Component,ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HomeComponent } from '../home/home.component';
import { GeminiService } from '../geminiservice.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chatbot',  
  standalone: true,
  imports: [RouterOutlet, HomeComponent, FormsModule, CommonModule],
  templateUrl: './chatbot.component.html', 
  styleUrls: ['./chatbot.component.css'], 
  encapsulation: ViewEncapsulation.Emulated 

})
export class ChatbotComponent { 
  title = 'trial';
  prompt: string = '';
  chatHistory: any[] = [];
  loading: boolean = false;

  constructor(private geminiService: GeminiService) {
    this.geminiService.getMessageHistory().subscribe((res) => {
      if (res) {
        this.chatHistory.push(res);
      }
    });
  } 

  sendData() {
    if (this.prompt) {
      this.loading = true;
      this.geminiService.generateText(this.prompt);
      const data = this.prompt;
      this.prompt = '';
      this.loading = false;
    }
  }

  formatText(text: string) {
    return text.replaceAll('*', '');
  }
}
