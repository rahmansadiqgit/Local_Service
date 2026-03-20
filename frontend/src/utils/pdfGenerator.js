import jsPDF from 'jspdf'

export const generatePDFSlip = (post, expertiseRows, serviceRows, productRows, skillWorkers, serviceWorkers, serviceDurations, productUnits) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin
  let yPosition = margin

  // Helper function to add a new page if needed
  const checkPageBreak = (spaceNeeded) => {
    if (yPosition + spaceNeeded > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
    }
  }

  // Header
  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text('SERVICE COSTING SLIP', margin, yPosition)
  yPosition += 8

  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Post: ${post.post_name}`, margin, yPosition)
  yPosition += 5
  doc.setFont(undefined, 'bold')
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition)
  yPosition += 8

  // Post Details
  doc.setFont(undefined, 'bold')
  doc.setFontSize(11)
  doc.text('Post Details', margin, yPosition)
  yPosition += 6
  doc.setFont(undefined, 'normal')
  doc.setFontSize(9)
  doc.text(`Title: ${post.post_title || 'N/A'}`, margin, yPosition)
  yPosition += 4
  doc.text(`Type: ${post.post_type}`, margin, yPosition)
  yPosition += 4
  doc.text(`Location: ${post.location || 'N/A'}`, margin, yPosition)
  yPosition += 4
  doc.text(`Description: ${post.description || 'N/A'}`, margin + 2, yPosition, { maxWidth: contentWidth - 4 })
  yPosition += 12

  // Expertise Section
  if (expertiseRows.length > 0) {
    checkPageBreak(40)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(11)
    doc.text('EXPERTISE', margin, yPosition)
    yPosition += 6

    doc.setFont(undefined, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text('Name', margin, yPosition)
    doc.text('Experience', margin + 60, yPosition)
    doc.text('Charge', margin + 100, yPosition)
    doc.text('Persons', margin + 135, yPosition)
    doc.text('Total', margin + 170, yPosition)
    yPosition += 4
    doc.setTextColor(0)

    expertiseRows.forEach((row) => {
      checkPageBreak(6)
      const workers = Number(skillWorkers[`skill-${row.id}`] || 0)
      const totalCost = workers * Number(row.cost_per_unit || 0)

      doc.text(row.skill_name.substring(0, 20), margin, yPosition)
      doc.text(row.unit || '-', margin + 60, yPosition)
      doc.text(`$${Number(row.cost_per_unit || 0).toFixed(2)}`, margin + 100, yPosition)
      doc.text(String(workers), margin + 135, yPosition)
      doc.text(`$${totalCost.toFixed(2)}`, margin + 170, yPosition)
      yPosition += 5
    })
    yPosition += 2
  }

  // Services Section
  if (serviceRows.length > 0) {
    checkPageBreak(40)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(11)
    doc.text('SERVICES', margin, yPosition)
    yPosition += 6

    doc.setFont(undefined, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text('Service', margin, yPosition)
    doc.text('Workers', margin + 60, yPosition)
    doc.text('Duration', margin + 100, yPosition)
    doc.text('Cost/Unit', margin + 135, yPosition)
    doc.text('Total', margin + 170, yPosition)
    yPosition += 4
    doc.setTextColor(0)

    serviceRows.forEach((row) => {
      checkPageBreak(6)
      const workers = Number(serviceWorkers[`service-${row.id}-workers`] || 0)
      const duration = Number(serviceDurations[`service-${row.id}-duration`] || 0)
      const totalCost = workers * duration * Number(row.cost_per_unit || 0)

      doc.text(row.service_name.substring(0, 20), margin, yPosition)
      doc.text(String(workers), margin + 60, yPosition)
      doc.text(`${duration} ${row.unit}`, margin + 100, yPosition)
      doc.text(`$${Number(row.cost_per_unit || 0).toFixed(2)}`, margin + 135, yPosition)
      doc.text(`$${totalCost.toFixed(2)}`, margin + 170, yPosition)
      yPosition += 5
    })
    yPosition += 2
  }

  // Products Section
  if (productRows.length > 0) {
    checkPageBreak(40)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(11)
    doc.text('PRODUCTS', margin, yPosition)
    yPosition += 6

    doc.setFont(undefined, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text('Product', margin, yPosition)
    doc.text('Unit', margin + 60, yPosition)
    doc.text('Cost/Unit', margin + 100, yPosition)
    doc.text('Qty', margin + 135, yPosition)
    doc.text('Total', margin + 170, yPosition)
    yPosition += 4
    doc.setTextColor(0)

    productRows.forEach((row) => {
      checkPageBreak(6)
      const units = Number(productUnits[`product-${row.id}`] || 0)
      const totalCost = units * Number(row.cost_per_unit || 0)

      doc.text(row.product_name.substring(0, 20), margin, yPosition)
      doc.text(row.unit || '-', margin + 60, yPosition)
      doc.text(`$${Number(row.cost_per_unit || 0).toFixed(2)}`, margin + 100, yPosition)
      doc.text(String(units), margin + 135, yPosition)
      doc.text(`$${totalCost.toFixed(2)}`, margin + 170, yPosition)
      yPosition += 5
    })
    yPosition += 2
  }

  // Totals Section
  checkPageBreak(20)
  doc.setDrawColor(100)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 6

  const expertiseTotal = expertiseRows.reduce((sum, row) => {
    const workers = Number(skillWorkers[`skill-${row.id}`] || 0)
    return sum + workers * Number(row.cost_per_unit || 0)
  }, 0)

  const serviceTotal = serviceRows.reduce((sum, row) => {
    const workers = Number(serviceWorkers[`service-${row.id}-workers`] || 0)
    const duration = Number(serviceDurations[`service-${row.id}-duration`] || 0)
    return sum + workers * duration * Number(row.cost_per_unit || 0)
  }, 0)

  const productTotal = productRows.reduce((sum, row) => {
    const units = Number(productUnits[`product-${row.id}`] || 0)
    return sum + units * Number(row.cost_per_unit || 0)
  }, 0)

  const grandTotal = expertiseTotal + serviceTotal + productTotal

  doc.setFont(undefined, 'bold')
  doc.setFontSize(10)
  doc.text(`Expertise Total: $${expertiseTotal.toFixed(2)}`, margin, yPosition)
  yPosition += 5
  doc.text(`Services Total: $${serviceTotal.toFixed(2)}`, margin, yPosition)
  yPosition += 5
  doc.text(`Products Total: $${productTotal.toFixed(2)}`, margin, yPosition)
  yPosition += 8

  doc.setFontSize(12)
  doc.setTextColor(220, 53, 69)
  doc.text(`GRAND TOTAL: $${grandTotal.toFixed(2)}`, margin, yPosition)

  return doc
}

export const downloadPDF = (doc, fileName = 'service-slip.pdf') => {
  doc.save(fileName)
}

export const getPDFAsBlob = (doc) => {
  return doc.output('blob')
}
