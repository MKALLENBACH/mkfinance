export interface ParsedTransaction {
  id: string
  date: string
  amount: number
  description: string
  type: 'receita' | 'despesa'
}

export function parseOFX(ofxContent: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  
  // A very basic and robust OFX parser using Regex
  // Matches blocks between <STMTTRN> and </STMTTRN>
  const stmtRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match
  
  while ((match = stmtRegex.exec(ofxContent)) !== null) {
    const block = match[1]
    
    // Extract Type (CREDIT or DEBIT) - not strictly necessary since amount sign usually dictates it
    // const trnTypeMatch = block.match(/<TRNTYPE>([^<\r\n]+)/i)
    
    // Extract Date (Format usually YYYYMMDDHHMMSS or YYYYMMDD)
    const dtPostedMatch = block.match(/<DTPOSTED>([^<\r\n]+)/i)
    // Extract Amount (Can be negative or positive)
    const trnAmtMatch = block.match(/<TRNAMT>([^<\r\n]+)/i)
    // Extract Memo/Description
    const memoMatch = block.match(/<MEMO>([^<\r\n]+)/i)
    // Extract Name if memo is empty
    const nameMatch = block.match(/<NAME>([^<\r\n]+)/i)
    // Extract FITID (Unique ID)
    const fitIdMatch = block.match(/<FITID>([^<\r\n]+)/i)

    if (dtPostedMatch && trnAmtMatch) {
      const rawDate = dtPostedMatch[1].trim()
      const year = rawDate.substring(0, 4)
      const month = rawDate.substring(4, 6)
      const day = rawDate.substring(6, 8)
      
      const date = `${year}-${month}-${day}`
      const amount = parseFloat(trnAmtMatch[1].trim().replace(',', '.'))
      const description = (memoMatch ? memoMatch[1] : (nameMatch ? nameMatch[1] : 'Sem descrição')).trim()
      const fitId = fitIdMatch ? fitIdMatch[1].trim() : Math.random().toString(36).substring(7)
      
      transactions.push({
        id: fitId,
        date,
        amount: Math.abs(amount),
        description,
        type: amount >= 0 ? 'receita' : 'despesa'
      })
    }
  }

  // Sort by date descending
  return transactions.sort((a, b) => b.date.localeCompare(a.date))
}
