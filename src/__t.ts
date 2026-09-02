import { organiseSoap } from "./components/profile/IssuePrescriptionDialog";
const note = `33 year old female reports a dry cough for 3 weeks. Denies fever, runny nose, chest pain, shortness of breath, wheezing or coughing blood. Assessed by video. Patient appeared comfortable and was speaking in complete sentences. Temperature, oxygen saturation and chest examination were not obtained.`;
const r = organiseSoap(note);
console.log(JSON.stringify({soap:r.soap, method:r.noteMethod, sym:r.symptomIndication, hasA:r.hasDocumentedAssessment, limited:r.limitedRemoteOnly}, null, 2));
