import { interviewLLM } from "./llm/model.js";


async function sample(){

    console.log("started....")
      const response = await interviewLLM.invoke("tell me about when you are feeling something different about you ");
      console.log(response);
}

sample();