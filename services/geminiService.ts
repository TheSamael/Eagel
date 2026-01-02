import { GoogleGenAI, Content, Part, FunctionDeclaration, Tool, Type } from "@google/genai";
import { Message, Role, Attachment, OutputMode, FileType } from "../types";
import { generateExcelBase64, generateWordDocBase64, utf8_to_b64 } from "../utils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are an expert Document Reviewer Agent. 
Your goal is to review, summarize, analyze, and critique documents uploaded by the user.
- Provide clear, professional, and structured responses.
- If the user asks for a specific type of review (e.g., tone, compliance, technical), focus strictly on that.
- If a document is unclear or you cannot process it, ask clarifying questions.
- Use formatting (Markdown) to make your output easy to read (bullet points, bold text for key insights).
- Maintain a helpful, objective, and analytical tone.
- When generating files, ONLY use the provided tool 'generate_file'. Do not write the file content in the chat.
`;

const generateFileTool: FunctionDeclaration = {
  name: 'generate_file',
  description: 'Generates a downloadable file for the user. Use this when the user requests a file output or the mode requires it.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { 
        type: Type.STRING, 
        description: 'Name of the file including extension. Supported extensions: .doc, .xlsx, .txt. For .doc, the content must be HTML structure. For .xlsx, content must be CSV.' 
      },
      content: { 
        type: Type.STRING, 
        description: 'The content of the file. If filename is .xlsx, this must be CSV data. If .doc, this must be HTML body content. If .txt, plain text.' 
      },
      mimeType: {
        type: Type.STRING,
        description: 'The mime type of the content being passed. "text/csv" for excel, "text/html" for word, "text/plain" for text.'
      }
    },
    required: ['filename', 'content', 'mimeType'],
  },
};

export const sendMessageToGemini = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[],
  outputMode: OutputMode,
  requestedFileType: FileType
): Promise<{ text: string; generatedFiles: Attachment[] }> => {
  try {
    const historyContent: Content[] = history.map((msg) => {
      const parts: Part[] = [];
      if (msg.attachments) {
        msg.attachments.forEach(att => parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } }));
      }
      if (msg.text) parts.push({ text: msg.text });
      return { role: msg.role === Role.USER ? 'user' : 'model', parts: parts };
    });

    const currentParts: Part[] = [];
    attachments.forEach(att => currentParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } }));
    
    // Inject output instructions
    let instruction = newMessage;
    if (outputMode === 'file_only') {
      instruction += `\n[SYSTEM: The user requested ONLY a file output. File type: ${requestedFileType}. Generate the file using the 'generate_file' tool. Keep your text response very brief (e.g., "Here is your file").]`;
    } else if (outputMode === 'text_and_file') {
      instruction += `\n[SYSTEM: The user requested BOTH text explanation and a downloadable file. Decide the best file type (doc, xlsx, or txt) based on the content (e.g. xlsx for tables, doc for formal reports). Use 'generate_file' tool to create it.]`;
    }

    if (instruction) currentParts.push({ text: instruction });

    const contents: Content[] = [...historyContent, { role: 'user', parts: currentParts }];

    const tools: Tool[] = outputMode !== 'text_only' ? [{ functionDeclarations: [generateFileTool] }] : [];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
        tools: tools,
      }
    });

    let textResponse = "";
    const generatedFiles: Attachment[] = [];

    // Parse candidates for text and function calls
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          textResponse += part.text;
        }
        if (part.functionCall) {
          const fc = part.functionCall;
          if (fc.name === 'generate_file') {
            const args = fc.args as any;
            const filename = args.filename || 'output.txt';
            const rawContent = args.content || '';
            const type = args.mimeType || 'text/plain';

            let base64Data = '';
            let finalMime = 'text/plain';

            if (filename.endsWith('.xlsx')) {
                base64Data = generateExcelBase64(rawContent);
                finalMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            } else if (filename.endsWith('.doc') || filename.endsWith('.docx')) {
                // Force extension to .doc if it was generated as docx but requested as doc, or vice versa if model messes up
                // But generally we handle .doc here.
                base64Data = generateWordDocBase64(rawContent);
                finalMime = 'application/msword'; 
            } else {
                base64Data = utf8_to_b64(rawContent);
                finalMime = 'text/plain';
            }

            generatedFiles.push({
                name: filename,
                mimeType: finalMime,
                data: base64Data
            });
          }
        }
      }
    }

    return {
      text: textResponse || (generatedFiles.length > 0 ? "File generated successfully." : "No response generated."),
      generatedFiles: generatedFiles
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return {
        text: `Error during processing: ${error.message || "Unknown error"}`,
        generatedFiles: []
    };
  }
};