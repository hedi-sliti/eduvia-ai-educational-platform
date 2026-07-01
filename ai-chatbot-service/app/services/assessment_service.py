from langchain_core.prompts import PromptTemplate
from app.core.llm import get_llm
from app.core.exceptions import LLMServiceException
from app.core.logging import get_logger

logger = get_logger()

ASSESSMENT_PROMPT = """You are an academic assessor for first-year university students.
The student has provided answers to an onboarding questionnaire.
Your task is to analyze these answers and output a concise assessment.

Student Answers:
{answers}

Provide your analysis in the following structured format (exact names):
Learning Style: [e.g. Visual, Auditory, Kinesthetic, Reading/Writing]
Competency Level: [e.g. Beginner, Intermediate, Advanced]
Recommendations:
- [Recommendation 1]
- [Recommendation 2]
- [Recommendation 3]
"""

def analyze_student_assessment(answers: dict) -> dict:
    try:
        logger.info("Starting student assessment analysis")
        
        llm = get_llm()
        prompt = PromptTemplate(
            input_variables=["answers"],
            template=ASSESSMENT_PROMPT
        )
        
        # Format inputs
        formatted_answers = "\n".join([f"Q: {k}\nA: {v}" for k, v in answers.items()])
        logger.info(f"Analyzing {len(answers)} assessment answers")
        
        # Run simple LLM chain
        chain = prompt | llm
        response_text = chain.invoke({"answers": formatted_answers})
        
        logger.info(f"LLM assessment response: {response_text[:200]}...")
        
        # Parse output manually
        result = {
            "learning_style": "Unclassified",
            "competency_level": "Beginner",
            "recommendations": []
        }
        
        lines = response_text.split('\n')
        for line in lines:
            if line.startswith("Learning Style:"):
                result["learning_style"] = line.split(":", 1)[1].strip()
            elif line.startswith("Competency Level:"):
                result["competency_level"] = line.split(":", 1)[1].strip()
            elif line.startswith("- "):
                result["recommendations"].append(line[2:].strip())
        
        logger.info(f"Assessment completed: {result['learning_style']}, {result['competency_level']}")
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing assessment: {str(e)}", exc_info=True)
        raise LLMServiceException(f"Assessment analysis failed: {str(e)}", "ASSESSMENT_ERROR")
