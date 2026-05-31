function parseMetric(text: string) {
  const lower = text.toLowerCase().trim();
  
  // breastmilk variations
  if (lower.includes('breastmilk') || lower.includes('breast ')) {
    const match = lower.match(/(\d+)\s*ml?/);
    if (match) {
      return { type: 'breastmilk', value: parseInt(match[1]), unit: 'ml' };
    }
  }
  
  // formula variations
  if (lower.includes('formula')) {
    const match = lower.match(/(\d+)\s*ml?/);
    if (match) {
      return { type: 'formula', value: parseInt(match[1]), unit: 'ml' };
    }
  }
  
  // potty - any variation
  if (lower.includes('potty')) {
    return { type: 'potty', value: 1, unit: 'count' };
  }
  
  // diaper - any variation
  if (lower.includes('diaper') || lower.includes('nappy')) {
    return { type: 'diaper', value: 1, unit: 'count' };
  }
  
  // bath - any variation
  if (lower.includes('bath') || lower.includes('shower')) {
    return { type: 'bath', value: 1, unit: 'done' };
  }
  
  // oil - any variation
  if (lower.includes('oil') || lower.includes('massage')) {
    return { type: 'oil', value: 1, unit: 'done' };
  }
  
  // weight - flexible format
  if (lower.includes('weight')) {
    const match = lower.match(/(\d+\.?\d*)\s*(kg|g)?/);
    if (match) {
      return { 
        type: 'weight', 
        value: parseFloat(match[1]), 
        unit: match[2] || 'kg' 
      };
    }
  }
  
  // fever - flexible format
  if (lower.includes('fever') || lower.includes('temp')) {
    const match = lower.match(/(\d+\.?\d*)\s*([cf])?/);
    if (match) {
      return { 
        type: 'fever', 
        value: parseFloat(match[1]), 
        unit: match[2] || 'f' 
      };
    }
  }
  
  // vaccine - flexible format
  if (lower.includes('vaccine')) {
    const dateMatch = lower.match(/(\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}))/);
    const timeMatch = lower.match(/(\d{1,2}:\d{2}|\d{1,2})\s*(?:am|pm)?/);
    
    let value = 'Vaccine recorded';
    if (dateMatch) value = `${dateMatch[1]}`;
    if (timeMatch) value += ` ${timeMatch[1]}`;
    
    return { 
      type: 'vaccine', 
      value: value,
      unit: 'given' 
    };
  }
  
  // doc notes - flexible
  if (lower.includes('doc') || lower.includes('doctor') || lower.includes('notes')) {
    const notesMatch = lower.match(/(?:doc|doctor|notes)\s+(.+)/);
    if (notesMatch) {
      return { 
        type: 'doc_notes', 
        value: notesMatch[1].trim(),
        unit: 'notes' 
      };
    }
  }
  
  // next appointment - flexible
  if (lower.includes('next') && (lower.includes('appt') || lower.includes('appointment'))) {
    const dateMatch = lower.match(/(\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}))/);
    const timeMatch = lower.match(/(\d{1,2}:\d{2}|\d{1,2})\s*(?:am|pm)?/);
    
    let value = 'Appointment scheduled';
    if (dateMatch) value = `${dateMatch[1]}`;
    if (timeMatch) value += ` ${timeMatch[1]}`;
    
    return { 
      type: 'next_appointment', 
      value: value,
      unit: 'scheduled' 
    };
  }
  
  return null;
}