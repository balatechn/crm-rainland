import { Module, Body, Controller, Get, Param, Post, Req, Res, UseGuards, Injectable, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';
import { LeadStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
class QuotationsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.quotation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lead: true, vehicle: true, createdBy: { select: { name: true } } },
    });
  }

  async create(userId: string, d: any) {
    const total = Number(d.basePrice) + Number(d.accessories||0) + Number(d.insurance||0) + Number(d.roadTax||0) - Number(d.discount||0);
    const number = 'Q' + Date.now();
    const q = await this.prisma.quotation.create({
      data: {
        number, leadId: d.leadId, vehicleId: d.vehicleId, createdById: userId,
        basePrice: Number(d.basePrice), accessories: Number(d.accessories||0),
        insurance: Number(d.insurance||0), roadTax: Number(d.roadTax||0),
        discount: Number(d.discount||0), total,
      },
    });
    await this.prisma.lead.update({ where: { id: d.leadId }, data: { status: LeadStatus.QUOTATION_SENT } });
    return q;
  }

  async pdf(id: string, res: Response) {
    const q = await this.prisma.quotation.findUnique({
      where: { id },
      include: { lead: { include: { branch: true } }, vehicle: true, createdBy: true },
    });
    if (!q) throw new NotFoundException();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${q.number}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text('Rainland Auto Corp', { align: 'center' });
    doc.fontSize(10).fillColor('#555').text('Montra & Isuzu Dealership', { align: 'center' });
    doc.moveDown();
    doc.fillColor('#000').fontSize(14).text(`Quotation: ${q.number}`);
    doc.fontSize(10).text(`Date: ${q.createdAt.toDateString()}`);
    doc.text(`Branch: ${q.lead.branch.name}`);
    doc.moveDown();

    doc.fontSize(12).text('Customer');
    doc.fontSize(10).text(`Name : ${q.lead.name}`);
    doc.text(`Mobile : ${q.lead.mobile}`);
    if (q.lead.email) doc.text(`Email : ${q.lead.email}`);
    doc.moveDown();

    doc.fontSize(12).text('Vehicle');
    doc.fontSize(10).text(`${q.vehicle.brand} ${q.vehicle.model}${q.vehicle.variant ? ' - '+q.vehicle.variant : ''}`);
    doc.moveDown();

    doc.fontSize(12).text('Price Breakup');
    const row = (k: string, v: number) => doc.fontSize(10).text(`${k.padEnd(20)} : ₹ ${v.toLocaleString('en-IN')}`);
    row('Base Price', q.basePrice);
    row('Accessories', q.accessories);
    row('Insurance', q.insurance);
    row('Road Tax', q.roadTax);
    row('Discount', -q.discount);
    doc.moveDown();
    doc.fontSize(14).text(`Total: ₹ ${q.total.toLocaleString('en-IN')}`, { align: 'right' });

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#666').text('This is a system generated quotation. Prices are indicative and subject to change.', { align: 'center' });

    doc.end();
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotations')
class QuotationsController {
  constructor(private svc: QuotationsService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Req() req: any, @Body() body: any) { return this.svc.create(req.user.id, body); }
  @Get(':id/pdf') pdf(@Param('id') id: string, @Res() res: Response) { return this.svc.pdf(id, res); }
}

@Module({ controllers: [QuotationsController], providers: [QuotationsService] })
export class QuotationsModule {}
