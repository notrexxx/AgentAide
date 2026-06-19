export function parseTicketText(text: string) {
  let flightInfo = '';
  let arrivalDate = '';
  let arrivalTime = '';
  let guestCount = 1;

  const cleanText = text.replace(/[\n\r]+/g, ' ').toUpperCase();

  const flightMatch = cleanText.match(/([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*(\d{1,4})/);
  if (flightMatch) {
    flightInfo = `${flightMatch[1]}${flightMatch[2]}`.replace(/\s+/g, '');
  }

  const monthMap: Record<string, number> = {
    JAN: 0, J4N: 0,
    FEB: 1, F3B: 1, FEBR: 1,
    MAR: 2, M4R: 2,
    APR: 3, '4PR': 3,
    MAY: 4, M4Y: 4,
    JUN: 5, J0N: 5,
    JUL: 6, J0L: 6,
    AUG: 7, A0G: 7, AU6: 7,
    SEP: 8, '5EP': 8, S3P: 8, SEPT: 8,
    OCT: 9, '0CT': 9, QCT: 9,
    NOV: 10, N0V: 10,
    DEC: 11, D3C: 11
  };
  
  const monthKeys = Object.keys(monthMap).join('|');
  
  const regexes = [
    new RegExp(`(0?[1-9]|[12]\\d|3[01])[\\s\\-\\/\\.,_]*(${monthKeys})(?:[\\s\\-\\/\\.,_]*(\\d{4}|\\d{2}))?(?!\\d)`, 'g'),
    new RegExp(`(${monthKeys})[\\s\\-\\/\\.,_]*(0?[1-9]|[12]\\d|3[01])(?:[\\s\\-\\/\\.,_]*(\\d{4}|\\d{2}))?(?!\\d)`, 'g'),
    /(20\d{2})[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12]\d|3[01])/g,
    /(0?[1-9]|[12]\d|3[01])[\/\-\.](0?[1-9]|[12]\d|3[01])[\/\-\.](20\d{2}|\d{2})/g
  ];

  const foundDates: Date[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const addDate = (y: number, m: number, d: number) => {
    if (y > 0 && y < 100) y += 2000;
    
    if (y === 0) {
      y = currentYear;
      if (m < currentMonth - 2) {
        y++;
      }
    }
    
    const dateObj = new Date(y, m, d);
    dateObj.setHours(0, 0, 0, 0);
    if (!isNaN(dateObj.getTime())) {
      foundDates.push(dateObj);
    }
  };

  let m;
  while ((m = regexes[0].exec(cleanText)) !== null) {
    addDate(m[3] ? parseInt(m[3], 10) : 0, monthMap[m[2]], parseInt(m[1], 10));
  }
  
  while ((m = regexes[1].exec(cleanText)) !== null) {
    addDate(m[3] ? parseInt(m[3], 10) : 0, monthMap[m[1]], parseInt(m[2], 10));
  }
  
  while ((m = regexes[2].exec(cleanText)) !== null) {
    addDate(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }
  
  while ((m = regexes[3].exec(cleanText)) !== null) {
    let p1 = parseInt(m[1], 10);
    let p2 = parseInt(m[2], 10);
    let p3 = parseInt(m[3], 10);
    if (p1 > 12) {
      addDate(p3, p2 - 1, p1);
    } else {
      addDate(p3, p1 - 1, p2);
    }
  }

  if (foundDates.length > 0) {
    const validDates = foundDates.filter(d => d.getFullYear() >= currentYear - 1 && d.getFullYear() <= currentYear + 5);
    
    if (validDates.length > 0) {
      validDates.sort((a, b) => {
        const diffA = a.getTime() - now.getTime();
        const diffB = b.getTime() - now.getTime();
        
        if (diffA >= 0 && diffB >= 0) return diffA - diffB;
        if (diffA < 0 && diffB < 0) return Math.abs(diffA) - Math.abs(diffB);
        return diffA >= 0 ? -1 : 1;
      });

      const bestDate = validDates[0];
      const fm = (bestDate.getMonth() + 1).toString().padStart(2, '0');
      const fd = bestDate.getDate().toString().padStart(2, '0');
      arrivalDate = `${fm}/${fd}/${bestDate.getFullYear()}`;
    }
  }

  const timeMatch = cleanText.match(/([01]?\d|2[0-3])\s*[:h]\s*([0-5]\d)\s*(AM|PM)?/i);
  if (timeMatch) {
    let hr = parseInt(timeMatch[1], 10);
    const min = timeMatch[2];
    const ampm = timeMatch[3];

    if (ampm === 'PM' && hr < 12) hr += 12;
    if (ampm === 'AM' && hr === 12) hr = 0;

    arrivalTime = `${hr.toString().padStart(2, '0')}:${min}`;
  } else {
    const altTimeMatch = cleanText.match(/(?:DEP|ARR|TIME|BRD|BOARD)[\s\:\-\=]*([01]\d|2[0-3])([0-5]\d)/i);
    if (altTimeMatch) {
      arrivalTime = `${altTimeMatch[1]}:${altTimeMatch[2]}`;
    }
  }

  const paxMatch = cleanText.match(/(\d+)\s*(?:PAX|GUEST|ADULT|CHILD)/i);
  if (paxMatch) {
    guestCount = parseInt(paxMatch[1], 10);
  }

  return { flightInfo, arrivalDate, arrivalTime, guestCount };
}