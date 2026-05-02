export interface createInterviewQuestion {
  role:string;
  experience:string;
  customRequirements?:string;
  /** Cleaned plain-text extracted from the candidate's resume (client-side). */
  resumeContext?:string;
  questionCount:number;
  interviewLevel:string;
  round:string;
  codingLanguage:string;
}

export interface question {
   title:string;
   text:string;
   audioUrl:string;
}

export interface createInterviewQuestionResponse {
   interviewId:string;
   questions:question[];
}


export interface AnswerScoreRequest {
  question:string;
  answer:string;
  round:string;
  codingLanguage?:string;
}

export interface AnswerScoreResponse {
  score:number;
  analysis:string;
}