import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { execSync } from 'child_process';
import { seedBaselineData } from './seed.js';
import { initializeDatabaseTables } from './init-db.js';
import { pool } from './db.js';
import crypto from 'crypto';

dotenv.config();

import fs from 'fs';
// Synchronous logo extraction from Excel
try {
  const excelLogoPath = 'C:\\Users\\maju\\Downloads\\SKC LOGO.xlsx';
  if (fs.existsSync(excelLogoPath)) {
    const wb = new ExcelJS.Workbook();
    wb.xlsx.readFile(excelLogoPath).then(() => {
      let logoBuf = null;
      let logoExt = 'png';
      if (wb.media && wb.media.length > 0) {
        logoBuf = wb.media[0].buffer;
        logoExt = wb.media[0].extension || 'png';
      }
      if (logoBuf) {
        const base64Str = `data:image/${logoExt};base64,${Buffer.from(logoBuf).toString('base64')}`;
        const targetTsFile = path.join(__dirname, '../../client/src/logoBase64.ts');
        const targetPngFile = path.join(__dirname, '../../client/public/skc_logo.png');
        fs.writeFileSync(targetTsFile, `export const SKC_LOGO_BASE64 = "${base64Str}";\n`);
        fs.writeFileSync(targetPngFile, logoBuf);
        console.log('✅ Extracted HD SKC Logo from Excel successfully!');
      }
    }).catch(e => console.error('Logo read error:', e.message));
  }
} catch (err) {
  console.error('Logo extraction setup error:', err.message);
}

const SKC_LOGO_BASE64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA3ADcAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAC0AMUDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9pfDf7E37KPhE7vDn7O/hG1brvj0OHP6rXc6V8PvBuhIIdG8I6daqnCLb2UaY/IVvUVXNU7k8sexBHaxRjC26/wDAakKECn0meeRUavcoRVyORTuFFRyTBKhur4QR7229cdaewFguAMg1DLKg5BrlfEPxv+F3ha+XTPE3jzR7G4YcQXWoxxv+RNZ/jH45/D3wx4C1P4jSeIrObT9NtHnmmt7lWG1Rnsa5ZYzDRu+ZaeZ208tzCtKKhSl7zSWjs29jtnu4o1+Y+/TtTP7Ts2BKSr8vWvw6/aR/4Ks/td/Hj4gX1v8AC3xRqWi6O1w0en6f4fjbzfK6KWZVLFj7EVZ+Dk3/AAWL1a5t9X8A3njyQblffqdxIYpAfUTE8flXy3+t0a2I5MPh5zje10vxP3OP0f8AOMPlccVmOYUMPKST5Jys1fWz8z7s/wCCrP8AwUR8RfsmaNZeAPhxYL/b2uWrSR3ky5S1izjcB3b0zxX5AfEr4meL/jfq9x4n8e6/cX2rSMWe4u5GYvk8AdgBzwMCv0d+JH7Bv7ZP7eng21uf2lNE0vw14m0Gz2aPrFvdbkuwxG6OaFfu+oZT+FeOab/wSUs/At4dC+OPx90TRNShdWmigk8wtDuwJOeQewGAK+a4iy/Ps3xik/dpP4U3az813P2jwfz3wz4Eyf2dapGWOi3zygnNyV9OVpbWsfJnwP8AH/xW+DPi628a/DHxLfadeW7eYGt2YJIoPRscEZPOQa/Zb/gmB+3/AH37Xng688O+ObJbbxRoKKt8Y1/d3K/89VHb3r450T/glvJ410aKw+CnxW0XxB5l0RdLD5eDCZPvMOoOz2xn869V8K/sj/tefsPeDr//AIZx+HVlq3iDW7MNqutR3KlYiowI4o2A5wM5Pf6V0cO5fnGUV3P4qXVLX7jh8Xs78P8AxCwCpUZwjjW0oSl7jSvrzt2923R/I/SKO7gZBIJd273qZZ4JOQQa/D74ofEv/gqjot9da/8AEW4+IWnsrEiS0EiwqfTEeFx+FdX+x/8A8Fhvjz8KfF9j4Z+N+v3XiLSZrgQ3q3kI+0W4JADhuCcehz9a96PF9GOJVLEUZ07vRtd+5+Q4r6P/ABB/ZE8bl2Mo4lwV3CnK7t5dz9nIHQR4B705pAoyK5XS/if4Nk8N2niabXrWCzvLdJo5bi5VeGGR1q5pfj3wp4hcR6D4jsbs4yy29yrEfka+sjXoy2kvvPwyeDxdO/NTato9HpY3PMEg4FEPmZ+dRVdpHlThelWYCdnNbHMPoprSYOKcGz0oAKKKKACiiigAooppk9BQA24mMQGBTXuCEzRcyLs5H6V8b/8ABSj/AIKSy/sf2lt4N8DaFHqHia+Xzf8ASn/dWcPIDsAcsSRwK48djsPl2Gdes7JHtcP8P5pxPmsMvy+HPUnsv1fkj7Ae6R1y0g+lfGH/AAWV/a98b/s3fBjTPDvw31iTT9W8T3zQfb4R80MCoS5U44blcHtX58eNv+Crv7ZPjLVZbt/ibeafIzHZa6WojRfu/LjqTXv37NX7JP7Vf/BRaTR/Fn7Y/ijUo/BemgzafDcxiO5vGbHT5QQhH8R59B3r498RVc+pzwuBhJSf2tkvmfvmD8H6nhzjsPnfFNal7Cm+aVNO8pNK6SX2tT4r+Ffwt/aJ/an8WSWXw90bVfEuoXQzcX8zPIFYn70khIAOevNffv7In/BE34gWOjfa/wBpv4walDDeRstx4Z8P6g4hZCclJH43D2AH1r7b0Hwt+zr+xZ8KZDpmnaZ4b0HS4N00kcYUnGPmPGWYnHrk1zH7Pf8AwUR/Z0/aX8cXfw6+HGtX66nbwmWNNSsWgE6A4LIT97tWmX8O5Tl1aKxUvaVX3fXta/5k8XeMHFXFWDqf2DglQwlP7agnJLvzNWj8ti98Pf2cf2PP2O/DqvoPg7w94ejLBX1C+2CSVvVpH5J/GvV/CPiTwj4t0iPWvCOrWN9aScR3FjIrIfbK1+ff7WXhTRW+PHiDWf21xeeKre+n8n4ZeAvDN3LK80QGPNeJQoRsnGSSKtf8EpPGfiz4NfH3xd+zF498LXPh211KAaz4X0O7vBM1vCxwY9397GCR2r2KeYSo4xUORRje2mlu17K12fAY/hbFZnkVXNJ4udWvGKm+bVSi7c3K2+Z8t9Xax93fFbxKfAvw51vxXGqltP0ua4VSvUopIr5M/CCc/wBsHwBf1rwHffs9fGC9/t3XfEl9P5MmoAOLWFXZQiegx/Ovrvx14dTxn4M1Twu77VvrCSBmPUblIr4P/ag/av8A2f8A/gnlbar+zH+1Lomq6db6dqU83h/WbexeWC6t3csACo6/410Y6caOMp1K3wWd7rS+lmzzOF6WMxXD2Lo5df6zzQdl8bgr35dm9bXsfSfhX9h/wB8MvjbpnxY+GN22iW9rb3CX+kW6/u7syYwTz8uDk8cVynx//b+1nwZ8Vn+CfwD+DmoePPEunxiXWILWYRw2iHkBpCD82O3/AOqua+Gv7XfxW/a+/aa0iL9ne21DTfhvottI/iDV9Q08qmov/DEoYAgj+9XHfsefETwH8Cf2tfjJofx08Qx6HrWp64Lyzl1SRY457XHy+Wx68dRXHUxkJRSovkhJtOSt06o9WjkeO9rVrZvD29ajSTjSu+b3pWtK2t0tWt0tz3z9k79sbwx+1Fcax4H8VeAbnw14p0GQJrXhzVNrvHkD5lOPnT/awPpWL8Xv2Lf2Df2j9U1TS9V8OaHHrltII7680edIbu3kxkBtmDnnoa8N+FPxW8MeIP2z/ix+114UVv8AhD/DvhUWq6qseyG7njUlsH+Lp1965f8AZ4/Ym0L4xfAzxV+2D8YPiFr+j6j4iubvVrVtP1B7dbWJWYoxwfn4Gcnsay+uVqlP2TjGp8Tu9FyrZ7dT045LDKcdPF4bF1MGrUkoxu2qk1dwet2ktXco/tdf8EmP2htF0yTxN8CPi/q3irTrO1CQaJrF25uIox/DG2drD2wPrXx74X8d/HH9nDxhDb6td694d1yx3fLcTPE2c8Z6Ar+Jr9Vv+Cfnx/17/hi2P4rfH3xPjT9Llulh1e8bDSWUR2q7nncSAe2TVHW/iF/wT5/4KSLN8LLi+t7zUhBmxlubFrW5XI4eFmALY68cdK8jGZJgcXy18PP2dSSuk9T7vhvxNzrJpV8sz3ArF4WnJxnUjBXS6t2Vn5rR+Zv/APBM39s/Uf2s/hFdXfi1UTXNDuha38iMMT/LlZPbI7V9Oxzb1yklfkd8aP2ev2yv+CXcF/c/ATxPcXngTU7sT3uqWFqjXFv/AA4lBB4x/EMCvOfA3/BXn9q/wRfxS3nxIbVo1fMtvqFsjIVzwdyhT65x0rpjxPHKYxw+YRkpLRytozyMZ4LYjjTFV824UrU54WbvCHNaUe6at7uvRn7bvGZVaNm+971J+8j2hDXzX/wT5/b88M/tn+F7h5dNXT9e03b9uslk3KykcOh4OD+lfSsdxE6BlNfW4XGYfGUFWou8WfgudZLmXD+ZVMBj6bhVg7NP+tiRWzS0isDxilrqPLCiiigBGIA5qpJcNEWMoCjcdvvVpiuOa8j/AGzfidrXwe/Z58UfEbw5btNqGm6ZI1nGq5/eEYB/Os61WNGlKpLZK51YHB1cxxtPC03705KK9W7Gh8T/ANp74I/CyRl8e/E/Q9L8tv3kd5qSrIP+A9a/KH/gsR8QPgj8bPi7pPxK+CfxX0vxBJNaLY6hp1nIzMrqWKOOOeuK+P8Axz4i8b/ETxNqfjDxl4gkvNUvJZJ7hbhyzyMMFhnoMZ4Ffd3/ARx/wTVx8NrB/wBpz4w6eZNJsJgvh3TZlIW5dTzM6n7wHb8a/MZZxjuKcQ8BGmlBu930S6+p/aGWeHOQ+B+DjxVjsdKVaCaVNJJTlJfCr3fz+Zof8E2f+Ca3hHSdQ0P42ftY3dtZTapdA+E/C2oShDdOBuV2VsEt3C88dewr9GvHP7QnwE+B93pvhfxz8RNF0Ke6xDZWt1cLhn6DsPc8Vx/7bv7J9v+0b8Lre28K350nxP4bm+3eFdTtzsNtcIOFGOgYcGvk/9iv4c+DP2r/GXxD8Fftl6JHefEaNRZNb33Dw20ShVkgDcryclh3PpX01GlLJVHB4eCXNtJ9X1v59j8TzzNZ+Jrq5/m2Kk403aVKO9NN+64p6OKXxPe51f/BWnw5qB1/4c/tARS3mreCbPWII/E9tZ3Ra1a0LhlkZRwwzjn0rf/bw+EqaX8PvB37Yf7NNla2914Okhv5V02MJ9s01gC65Uc/LziuL8I3l7+zrc+J/2Av2o9UeXwPqWmzf8IZ4n1LLL5BHEbuc4KZ6npivY/wBgnxP8L/hv8GtP/Z98TftA+HPF9xbvJFbRx3SMBbEkpEQ5y+F/w7U6cadatP2lo8+99HGcdFa/TqmViKmMyvK8NKinVjh27cqfJVo1NbytopLVO+q0PM/HHw6/aG+NGxh8Jft3fsnWuh61b614Wjs5tO8QzNF9kb+JxweQcg45yO4Oa774G/8ABOzx3a/HTT/2sfjn8Xbi68bws3nWukoqWiwldvkcjJUZPPc19VaP/AIzp1lFpuhrZw28ahYYbYKqKvoAvQVogqwyn4V6tHLcFzc7bk733ur9z4fGcb5t9W+q0IRpx5XC/Kud073UW306bAqM0eEX86yfFPw68GeOLZbXxh4XsdSjXot5apIB/30DWtvXOP4vY04TDOA4Nepyxl0ufF0q1ajPnptp91oZ+h+EfD/AY09dI8N6Nb2NtGPkt7WFURfwArz344fscfs8ftC3tvqPxa+HFpql1ajEF2ykSKvpuBBx7V6okqMvJ/WlP2cLuZv1qZUqcqbhJK3Y6MPmOYYXEe3o1ZRn/Mm7/eeLfFn9jH4e+NP2crv9m7wG3/AAiuj3kSRB9MgGVQEErjvnFct+1Z8EvH/h39iC4+AvwF0ea+vf7Ot9LiWParGEkJI/J/u5Jr6VxDIM/KcUyWCGT+EetY1MHRqRaWl1b5HfhuIMyo1Kcpz51CftLS1Tl3fc+FvidpOgWXg/w/wEwtQ8PS2J17wL59nr5kVY1vIycx7f4iSMn2PvXB/AvwprHxl8a+HfgX4r0Kx8K/Ez4T6zBdPeR24VdR01SFba8Y5LLjIPHSvsn9p/9lDwb+0po9kdSv7nSda0ebzdF8Qaa+y5s5O5VvQ8ZHfFfPfiD4IaB/wTY+H/AIw/au8UeOdW8beMr6zWxtb/AFTHUn92mAcBc4yfavCxOCrUayqNJwitX15V0t3T6n6Pk+f4HHZZLD0ptYqq9IWbbqydnLm25HF2kntui7+3d/wQCk+EXjOH9l/wX8PYdW8R60lvBbXWrzxfYcSsVO/5s8e4HWvjT/gof/wS58Y/BHSoPjr8P9NF7o91GsutafpkJYadKVBcovUxk5x3HSve9D+GnwV+DnwT1H9s79tWytfEfjHxh5d5Y6fMu6RZCQ8NvCASeoXpwK7b9jX9vn4hfFbxrb/BX9p34S6lp9x4mkmfw/cT6eUthb44hbIyxA/irysRRw+a1HQxsruesLa8i6X82fbcOZvmnAfJjuHoc1OhpieZ2VaS+LkTe0NdUj5x/wCCJvjb4Q/BvxFr/j34s/F3RtFnvLWOysNNuroKz7TuZ+3HQCv1U8G/Fb4e+PoEufBfjLTdUjflWs7pZOPwNfj1/wAFYv8Agn7d/s2ePX+Lfw40yT/hD9and5PJP/HhOTkp7KecelfM/wAEPjv8T/gj4+07x54E8S31ndWU6u0EczbHGQSrKOCCM5zXk4XPsVw3Wjl1al7qe9903uffcQeFOXeMWDqcXZVjvfqRu4SirRcVrC61Vno7n9I8cxZcqlTA5Ga4v4JeOpPiX8LNA8dyI0batpMN2y+hdA39a7GEnGK/TqU1UpqS6n8X4ijUwuIlRqbxbT9VoPoqORnDcUVoYlO8vooLVrqeURooyzN0Ar4x/a8/4Kl/se+HtM1r4Ma9ezeJWureW11CHS4xJHGcEFWfO3OfTvXuH7c0Hiyz/ZN8cTeC5Ln+0v7Dl+zi2Y+Z93nHfpnpX8/KyvDDcL9naa6mVUkY5zG3Xg8EdK+L4szzF5ZyUqMfi6vVeh/RXgT4W5Tx17fH4+q4qi1aMXZ33vfeyPqz9lX9lD4b/tiftBw+Gfh1oE1hoOlw79UlutjM6E8EkZ+Y9MD0zX68a7qngr9lv4E3Gow2yW2j+F9J3LHCoUbY1xj6mvlr/gmp+zf4++BH7C1x8QvhpodnJ488WWov7ZdW4XBGYo2J5wFP5k11fxW/ax8IaP4P0v8AZ4/be0mXQb/xhoLR6pqlrCTp8UjZBQSdmxz0wK2yejHLct9rWVqlRXbtom9l6HJ4kZ1iuMuKvqWGm6uEws+RQvzTaj8Urdb62MHwD+3D8UdMi/4aM+PHiPR9D8C6xasfD/hOAeZqFzxmNhwDyoJ/Guf1q70b9rrxbb/ALSz6bG60X4keHdQgi1jSdTzb/AGqzc4Pmp/F8vIzzx2NYen/sr/DX9jvT9P8Aj54Ji8S/G68kmWz8N2P2v7TDptu4J3BQSuBwM447Yr3n9gD4I+PNE1nxd+0B8V/Ckeia540vldNHjYYs7VBiNCBxu7n3rbDRxWIqRp1dt3bX0al37HmZlWyHKMLWx2A0aShHRRUlezhKm/eatvJ7taHvd54D0XxroNva+PvDWn305ttt19ot1kXJXDAbgeM1+Sf/AVL/Zp0r9lDx/b2vws8My2Gg+IpHvFvo5Nv2a4yS0SHggHOdua/ZARKOVb2wK/PP/gsn4707V/DGsfDHxPBa+dpy2GqaCyriRwZfLlVj6c/rWnE+Fo1sqleyaWj6/f5nL4M55mGE40pU4rnpVHacOlu9vJ/gfAnwu/ao+P3hCdJtN+N3iO1+ygRafEt87xnaOAyElSOmcivqP4Z/wDBVP8AbR8C39na+N49B8Sad5OPtDqYXLdfmIHy+mcYPavFdB+Cv9oafYa7ZXDC3kVvM27djv8AwtjHJwQfoeehrU8U/CTxN4N0t/FNnfxXFrbqs19BeMNrDowjbqCMFSp+U4K44Ar8/wAD/aWFp81OpL7/APM/rHiPA8A55X5K+EpN6p3ik0/VWaPrDQv+C0ttqDTeHviN8FdY0c/Z38zUNOmWbyu25c4z1zkfrXSfBT/grh8JNMu08FfFnxJcSbsHTvEDWZQSxn7onX+Bx3IyDjNfFng3w14j+IAVvCHhXXLy0usPbPY6LKYwxGfnO3BGRtbk9jkjgdzr37GHj7x7phudQ+AWsW91cReXHcQ26oYguGGAzZXcMjpxXvU8w4ilHng27dGj8szDgHwrpSlSrfur9pptPvZ6/LY+zfBn/BQrTfDfxCutB+Jl5b3/AIbuj52k+LNKYSQojc+VKq8qQO+OnNe1ePviv4X174R33jDwL4m+2xQwecl1o7CWRApBLhQRnAByOpFfkh4v/ZC8Y+B4LzU/Duoa5pNxprNHNbX1jMEkG0YlU7WXg8MD1AqT4Ya5+0r8PNYXxD4f8VW7PbyxI01vdALMxPzIV+6TjHykAH611UM+zLDy5MRSffzPAx/hBwvmlFYjKcdHmjo4vRO23V2b7rTyP2Q8O/E3wbqHgiLxxDr9u+m/ZxJJebxsVcck+mD1HaugsNSs9Tto7yynWWORA0bxnKsp7ivyp8BfttajY+JbzS/Ftovh+6vk+z6lcR2zHTrzIwfOthxGx5yyfjX0D8GP24dT+C+lW/w58baB9t05rcnwxrlvdGS3uVzxAZccEcgbuRgA+te9g8+w+Iiney/LyaPyvPPC/PcqvaN29Ur7rrZ7N+mtuh9s7X54+lcv8YPg/wCCfjf4GvPh58RNFivtLv49s8Eh/Ig9iO1P+HHxT8NfFHw9D4j8LXyzQSAB1yN0T45Rh2I9KsfED4keEfhv4bm8V+OfEFtpmn265murqQKq/nXsOtQlR52/dZ+fUqWYYXGqFNSjVi9Ek+a58saJ/wAE2L2//aRsfiF8T/Fi3/gvwfbxR+CfDwlZhCEHWUHg4IzznPGelS/tYftuaJ4X8Tw/B39mfwRD4u+ITfubNrW2EkWnbuCWfovAzjIHHNev/wDDUnwD+JGmzeFvCnxQtftWqQPBYzMjoskjDACsyhWJyOAa+O/gB+0V8Jv+Cduga58PvjN8O9QHxAF5M9vcQab5kmtKWJjKSjtzjkjFeFiJYbDRUaMuSEtZSWr9L/kfqWU083zqs6mYUpVatFJU6NuRO+8pbXSfxd+p9dW3wd8T/H39laP4Y/tQWtnca1qmleXq/wBk+5HORwy8dQcdPSvxf8cfAnR/2Zv2rpPhV+0CbxdE0rUBLNNZx5e7td2UI5H3gAD6Gv0//ZYtv22v2i/i/ZftE/F/X7rwb4RtlP8AY/gu3Y5uo2HDTA85788+1cP/AMFxf2T9P8ffCi3/AGgtB01P7U8PusV+8a7XktWPTjrg4/CvIz/ArMcsWKhBqVPVX3aXf8z7zwr4mlwjxdPIMXiF7DGJxkqb0pVJaJJ7X6O2h77+yp+3r+yd8Z9PsfAvwt8bQ2dxaWscVvpF8vky7VGAqg9cY7E19E2sqyfNGeOtfzSeCNe1fw34qs9Q8LPPbahb3Ky2s8DMGDg9Rg1/RJ+znrnijxD8GvDWt+L4THqV1o8El5G3VZDGCR9c11cJ8QV86pSjVhZx0uj5/AcPCrBeHeNo18HXc6de+krcye71W6fc9AxnqKKRGyuaK+wPwU+Vv2+/+Cj3wi/Yz0P+xfEVlJrWu31uxttDhwSUPG5yei/WvyF0bVtM/aw/ax0pvB3w6s/Dq+JNdhWbTrGRmhT5xvIXpyBzxj+dexf8ABcX4X/Efxt+1ncePtDi/tLR9WsIv7Lysn7t1XBjB6ZB5/GuR/wCCNPg7xX41/bg8PXuoyPnTLee8ZWXqyrlRnHqO1flObYzH5jxFDAMtIKSkra763Pv/AA+4Y4d4M8Ja/EuDrOpiKkGpO7sr6RXLey9Ln7gW8ek/D74dRQyPHb2uk6aAzfKAioHXgelfGf7Fnxq8BftnL498Kfsh+NdC8SxjeKaLQ9DvrWJfs9rkhWjyAzAj3JHtX1p4A+Nnwn+NUmteHfBmvWuqSaPfSafrFqPvQTISrI6tzjg+xrwv49f8BNz9i/Uor34j39gfBd5Cryy6zoupPZ7GP8RCsFOPcV+g4qVOFSjUpVJSg1ez6tvR6dD+T+HcTluGliMPmKqU68m4qUY3lF3vto/e8tbGz4B/4Jyz/AAW+Oek/EH9nT4t6ponhnzidc8M3F5JcW88eMhYlckJk4+nOMZr6ztYxGFTZ0GK+af8Agmzostl4G1i80f8AaQ1D4ieH21RodHur+H57dY+Cu4j5ue44r6aRUDYWurAU6fs1UipbvS90v0+48fixYrG1szaoYmv7V01pNx5W+vvJ639dSvql09haSXSxM3lqW2p1bAzge9fl7/wUT8QeEfi/8fvBHgvWJV/sXUIZNOieVGVoLjDxsrqO5WXb/wABr9Q7+4jWEt67toyygckenvrX5y/t/wDw/wDCXifxG3iLwfd5sL27WfW9LuITFNp9zsKmcKw3BX4yyjhgrdBmvP4gpSq4FqOv/APqvCbEU8LxPFzbd00n01VvvPKh4X13/hFptL+1b9Yt7B7ZJmYETyRq0Zfnrn7w+oPevoT9hT9mvRPhb4cf9rL44zra6Fp9q03hi1uJvLe7Z14uW6EKw4Uf3cn0r52m8ca3/AGQ3g/ULkXmqSWbwx3U6eXNaxsoVsAcbynAbnB5wa+uP+CSX7TnhXxr4Mvf2N/inJDcQWcM6afDqHzC5tGJJgYEY4JOB7/Svl8vjhcbjIQxWkbaK+jfmfuvHWWZlguH62MwUfaSm0pTirzhF3bkl1v36Hzb+1v/AMFZPjvrPja+8K/s26bZ6H4fs7lrePU2gSSScg43IDwF7DvXmPhz4z/8FFPilfS/8Iz8SPF2uX1rbieZdK3KI09gAAe+cZrj/wBv/wDZ31/9lf8Aaa1Hw7omnvHpF1Ot7o1zEGIaFjwuc8kHI/Gvs7/gmF+0B+y14X0O20W/8b/8Ir4g+zKmp2epT+VDLIoA81D2Y9xzj8a8jC0c0znOpYTMKjp8r92LVl93VH2OYZbwPwrwRRznJsLDE+0S55tc7jdb2v7rv0PnS1/bJ/4KcfC9V17xBf8Aia4tYV3XVpr+hySwhfcrt/HNesfA/wCN37Mv/BQKNvhH8VfBL+BPF1xC7291o837mV+hZAeRn+6wOffFfdXxf/ao/ZS+E/hSPV/iF8S9Fe1uZFihjilW5LbvYbhj1OOK/MD9tfx3+zd8Xf2lPDcv7JOnzf2vfXkaX0mlWphV5dw2uqAAbuTlhjHWvTrYeOSwUqeI9re/uS126rqfNZfhcJ4hRl9byhYGMEnHFU04xun8LXwu51Pxl+AniX4T+NR8G/ihMLi08x20/xHChWG/tc7Edwe0sYYbvu5yDwa6n4eW9p4et7n4WfEO8+0+H7tC9tMSAYI3k8p5Y/7rRybVyMb0YE5OTXbf2/448d+J9M/Zs/Z/wBPj8QeJbOzRtdu4ZQbSxjRBvllfG0NkH5T949AKqR/Bj4b/BO9uPHP7Z/xC0/xDqk91Nc6J4O8P+ZNNPMVG2QDmT7qqAQE4ya7Pq/scY3TVorTme22q8zypZ7WxWQUo4ypes1JqEVebaflNR+yn8V20rGV+yD4m+M/gv8AaK1Lwp+zzMviK1jV7fxMt1dNnp9uUYiO4DYIJYEHCnIwVxjGPe/if4H+H/xvnvvhj8YvFd98SvF0kBdvDPh++e1sdO3A43eWyquCOHkYsfTivj79ob9un4uam2vr8HfB1j4G0O1Xbef8I55f2maQgDymlAAVhnnb09fXB/4J0/tM2n7O37Q994g1yG4v4/EywrpzPNdFd5u5jmma+7kYyeme9Y088wdHELDaSi3Zya0XkkdOZ+HvEWYZdU4gjBUqsIRcIR1qT63lJaLvZelz7S/Z0/4Jh6p4NsooPiP8UdVk0iLVotRsfCkM4kis2jcMi+cy7zjHO0qDXq/wC2JafBP4T+Brr9p7xt8N9P1bWvCOmONJnuLcO4dsBUGemX284yBmvTfgz8SdP+Lnw60r4g2Nv9nXTbUSDfvDGO3rWv+018DtJ/aK+DGvfCXWJ2hj1azZIbhf+WMw5jf3w2DjNfZwwhSn4W6jtLld7aJn8/VOHsxzDiKnVzSo0lK01fmdN/EtO63PjvwX8Of+Crn7Rehx/GI/HnTfANndQ/atI8P2tmr7Y2GUDjac8HuT/u16f+z78SvGH7Wn7PPxD+BvxvktpvFXhyS60XVri3h2xzsEPlzADgZ68Uv7K2pftLfCzRtU+Dn7TXjXwva6Houk/YtE160v0W5kwu0Oyk4GFx1A5rD/AGWPiF+x3+yJrWtfCvVf2kbXWvEniC4bU9W1zUZVVLpnYgKHGVyPTOe9eHRjhqMo80+XmTUuaV276bd7n2+YVcRjI14UcPCUqMoTouhT+yndtzS10tdPW5+WHwU8a+A/2e/2g11n4vfDuTxFa6LqEkUmlmbZ+9RwNxB4bBHQ96/cP9kX9rz4M/tWeA4vE/wqvtiwxqt3pkq7JbRsfcZf69DX4k/8FEfD+meE/wBr/wAaQaNMtxZ3GsNe2skZGxo5gHBUjqMn6e9fSn/BATSPiPd/tBa14i02zuI/DkWhyRahNk+U85kQxqOxbAb8M18lw3j8Vl2eTy+CvByey1Xqz+hvGfhHKuKvDihxZVqyjXhTg0nJ8rul7vK9n6an7Do+RkGioIy+wAn8qK/Wz+ErH5Hf8FbP+Cnfhjx9qWrfs3+Cfh3pur2OnyNHd61qFt5m2YcHyR2I/vetcp/wQS0a61v9qvUtaDoI9N8PyeYrR8sZGQDB7jj1r5r/AG2/2evif+zx8f8AxB4Y8c6VM0c2oTT2N9JG2y7hkclWBxgkZ/A19Jf8EB9d1SH9prWPD/kxqLvw63mO33lKuuCK/HcHiMbiOKYPGXT5nZNW9D/QXOeH+H+HfAXEwyOalCdNSlK97t2u/J+R9Xfth/Bzxz+xv8W5v24P2Z7GS4trict478NQtxeRk/NMq9A2QM+vB9a4X4fW37QH/BXTVE8TeOtaj8K/Cy1uBs0XT7wC7vHU4KybT8vfJPtgd6774p/8ExP2qfiD4o1zWLD9tzXLez1a/lmj05o2KQxszERAbsYAYDp2riPhp/wRp/ag+EU14Phv+2RqOjrfS+Zci1tmVZHzncRuxn6V9hWweZVMZzqi3TvrFSSTd9/TyPwHK8y4Vp5Ap1cxpfXopRhVdObcY21T0s5LZS1PvP4K/BnwH8CvAFn8PPhpo0VjptjGFjhiHU92J7k9ya7KKMhFz+Ned/syfCnx98Hfhfa+DfiN8SbvxZqkMjm41i8Xa8uTnGPQV6TEAfvD3r66jzKmly8vl28j8DzJueYVJOr7S7fv6+95666jJrVG+8tef/F79nD4XfGvTPsfjLQladN3kX0LGOeHP911wfwPFejfKWyajdEAJAqpRjKNpK5nh8ViMHWVWjJxktmnY/Lr9p7/AII1fF3Qhe+JPgT8SodQs9zSppurN5U0a9SBKox19Rivj74g/Dv4neFJETxV4I1TT7zSH/ealc/LLxgny54iUfqCM4xn2Nf0ATxxlPmUV5n8f/2Y/hp+0B4OuvDfiTR0imuI28m/t1Ec0TEEbgRjn+Y618nmfCmExUZVKF4y7dL/AKH9AcG+PmbZfKnhc5gq1NWXNa0kttbfErdz8efBX/BR39ofwVpjeCtS8Wx+JNN+y7V0vxRZC5/d/wB3zY8k8Z61i33xu/Zq8cXP9pePP2V9Jt5bqbas3h3xE9ttfqX2DgfU1pftf/sh+Ov2bfjmnwotJl8UXGqW/m6T9hswLlI92ApUD5umM+5r1L4G/wDBH26XSIfip+1z40g8J+H1xcf2U10onaPghJT91PcDJ96+IjguIKmIdG91HR81ml83/mf0disw8K8Dk9PNIS9k66vFUnKM6j8oRa1b7o8Nv9O/Z5+IN5/wjfws+BXxA1LUFjLMLLXDcgDpn5UPGfTBr6a/ZN/Ye+GXwA8HyftB/tU/ECTwbHdQ5tdBa6C3kcX9xnxv3N6Jg4OCa6S+/bu/Z5+FbyfBn9jL4e6bplva27Q3Xi+ayB6cb0GC0hzyC2B/Ovlf4p2niP4n+LP7f+IvxbvtX864YxvqlpIV3Y/uxO2wD029K6XLB4K04Wq1PRKKffzPmaEuJeJMPLBXqYHCS1fO3OrKPa1rQv8ANn0Jrv7bvwk0TTdU0n9i7w9Z+D7e6Z4b7Xpod1/dnAO8KclVwSfm5yp45rzvR/FeheFr++8VT6+9/wCJ594hvtRlaST7U68sN+eERlVe29mPavm7xf4N1zwRq661oeo2txL5e4T6XMJIZFx3XAYZHYjOai8GePL7xFO1jd2LXF5c3kjtIZ8IuWP3ueOTznsK82pnmKlU5aq97oui9Oh9tg/C/J8Jg/a4KTlBpOUpO835Se7XlpY7qXTry3iuNe+ys9mLjZDJGcNc3LvueTdnJAAB57bfU1Ts4tL06HSfEtmzfaP7VkvNsbEswDAQjHq371vwx6VV8YakdA0O30Q6zHcPJF+7t1k+6CcGQ4+6Dk4B5IG44GK6P4UaZH4esV+K/jG2t5NP0uZI9BtZJgP7UugMhVXP+rQgMzdMAAc5rno+/iOVerPaxX+xZW6spb+7GK3l0St67n6b/wDBM3xzc3Gi3nwn1TWvMbwzp1mkdpu5SZoy8x6c8uF5/u19ZakzPp8vlyBMxsBJnhTg81+e/wDwSy8FePNf8e3Xii6s7mCzEw1LWL6TK+fOwPlWwPcAFpG9CVFfoNqL2ltaTSX7KkCRnzGkPG3HNfr2TzlLLU6it6n+ffiFg6GB4uqQou92m7a+91+/sfmf4L/Y+/Zd8Y+KfEfi79rH9rGzvr6+8QXbWlnY+LtsawGQ7QRkENjgjoK7TwX+wH/wTff4tWnjjwd8R/D+paLo2hSDU9Bm1JbgS4I/0lyWyMDqcd65/CJvj3/8ABqL3/wAPf6hfGh8C/2hdG6Z7/UNOsZ5rSKUn5vmQ88/3QcV9Hfswfs3/ALBmqeHrj4k/s/eFdJvrHXNPe0uLm1uXkVoX+/GQT8vuMAivGwuGw1bEOnBUnZ36uTP0LOs9zXL8tWIqVsXSU4qKThGMLNJWVnp5X1Py7/4Kq6R8MtH/avW5+E0enXWhSaHaeQtnNuhIUbdoYHphccc8V9hf8Ehv2/fgVqdja/s1/8K6sfCGsNHutZ7QZh1GQY3ZY/N5nfnOecGvkH/grX8NfBnws/aqn8BfDjSorPS7PRbcQWcLE+V8rEjqT1Pf1rkv+CbHwi8ffFX9q/wAKweFdKuJYdO1SO7vrqLcFhiRgSXI6Zxx6n8a+Ko43MMDxZU9jG95WaS+8/o7NeGch4o8CcPUx9eUVSo88JSlZuSWnMr2d9up/QGrkoDRTrUf6Oqn+FQOlFfsXzP8APKVNc25+e3/Bbj9q7wN8L/Blr8G4vh5pOteJNbtWlhm1K2WQWcPTeuRy2eBzXxp/wRg8cw+Cv229CFy5ij1a1uLP5vlBdvmxj144r7J/4LR/8E+viP8AtALpvxz+DmmyalqmkWph1DS42+eaEHIKDuw5GB1zX5gfCDxD4v8A2c/jnoPjHxHo2o6Xd6Dq8U00V1bvEyKrYYMGA6jPavy3iD+0sLxFTxNWL9mpKzW1rn90+FuB4bzrwXxWWYGsniakJ88HLXm6WT2Xpuf0leYgXOKh1DWdN0i1a71G7jhjTlnkYKB+deL+PP2hPiTcfDvwb4z+AHw3PiuHxJdWwupY7kKtrauuWmJzzivnv4k/s4+O/2jv2m9S+FXx5/bDvbe3RP7Q0zwT4fzaXb2InH718YYgkDqPpX6JVx0o006UL3ta7SWu2p/JOW8NRrVpfXqyoxjzN6OUvddmuVdfWyPq7wT+1b8B/iP8TLj4SeBviJY6prlnbtPdWdm/meWqsFOWA28EjjOa9Cu9Ws9Oha5vJ1jjXq7tgCvlvs6/YKh8C8Uf6W9lq+q3jCBjbk3Oo3JLDhsZc5ODjoMV2n7ZPwP+Ln7Sf7Nc2l/CfVJLXV5hBqGjytO0ALddr+xUsNrAj24p08XU9jPnalOO6j+XqGKyfA/wBldRjBzpYao1FVKitfvK3Y9utdWt7tBJFKGVsfdYHPHtUhvUUbihx61+Y37I+oftvab8QNQ+E3izxdrGgx2N9dR2LXjrIpkjQOI13rseM5x8uDzwa9FvP2tviT8avD2ueGL/4J+m+DvEnh95LebRvDfh5ruR51OPmmKMnzdQFxgHr1rlo5xz0+adNxeuj8j28y8O8Vg8a6VHEQqwXK3KN2kpbOy/HsfYnxh+O/wv+BfhWTxn8TPEMAptjEwBaRss7HoqqMkk+gFfFv7VP/BY/QNI0O4g+BEU3mJIsa315psmZFJwWQHC8cj5j14we/zP8AEjwZ+13+0LHdabr3hvWb+HTbORpLnWLwTOrLktI2CViGOgODzWv/AMEqvB/wy+LPx0h8F/FKL7dHYWTNpukz/NA80TAkuMfORyeSRxnqOPnsXnGZY3Fxw9OPs4z0uz9byXwv4T4dyGrnOZVPrc6CUpU4NWSe199/M739jbwl+05+0L8cU/aMk8FX6Yt1FrrXiKc+S7FWVmCkZKc5CKNuVHIr0L9tf/AIIyftZ/tD3a69a/tGtrA25/sW+jFvbRN1xGqcYz/eyeua/ffWkaHpumWkdlptjHbwxKFjihXaqjHAAq6bZNvQmvoIZBhPqToVm5Xd27217n5fifFLNYcQQzLLqNOl7NcsIuKklHotV+KsfiN4w/4J1ftp/CLR5Bq3wt/tS3yRcfYIY7pXXsSoyx/AZrzXV/CPjbwveN5+ialp5uYyvkpbyr5EgHO5D93n6cV/QAbK2cbHTP+ywzXHfEj4CfCX4oWDWPjTwPp95uGBM0IWRPdXGGU/QivFxHBeFlC1Gbj6/5n6ZlP0ks0jV/4VMJGadk3C8fw1R+FWu39/d6Lb6R4r8MW8sjAlbiOL96I16HKgHt7+4ryeHULTwnr0k2gySC1mZl/eIDuXPzD3bv+VfqV+1n/AMEqbzQ9NvvFnwle81qzUPL9geUfbLQ4zmNjjzh7N83YGvzx+MPwruvhleW2q65okjQNKqQ3iuUYgHLI6EZjlBOCrAH1zXw+dZJj8D79TZdT+l/D3xD4Z4ooSWDl70l8F7O/oy1oHgvTr4rdeJrFre3uY1ks9OZt13dk4CiQ8lEYjgYyf4e5r174Y/B3xx8XPjRpHgSG2+0eIGWOO20m3hP2XSLVT/AK2UfdTbnITIZjjd0ArjfhB4e+Ivxf8AFdh8O/h7p91rmp3UoSGzB3bOer/3R1yT2Br9Sv8Agnb+wXD+yt4dudcv8b2P/tLxi+vRr/at4zZWJQSRGufryepNepw/k8sZVTSfIvib2f/BufAeKXHcOF8tnKdRLESTVOG8lfd6N2Xrqz2z4C/B3Q/gj8ONP8CaEPM+ywj7TcSAbp5D9529STmsP9snS/GHiD9mTxpo/gQyjVLjw/cpam3bEhYxnhcc5Ir1BSMsGXgV4X+2P4j/ax8DWGk+M/Bm3w1puvWunySPr+g3SfvbuPAwIzngjn61+nYhU6ODkraJWst/W3U/inKamKzLiCnWnKLm5815uybvezb0V9jwb9hT4hf8E/vEH7Mml+D/ABTD4TsdYtdNWLxJZ67DFFO1xtxIzeZyQWz3Na3/AATPg8I2/wAWfi9ffA0f8W7GrwrobQ7hbmYIfN8oH+HPpgVxHwzs/wDgm7+2d41mX4t/Bi38H+PbeYHVNDvvMs3mkyM4Cld+SewzX1T48i+En7Fn7MOu6h4M0Gy0PSdF0mV7a1t02qZNh2j/AGiTj1NeBgU5wWIlODjTvqlaWnfsfpHENenSrVMuhGv7fFSj+7qNOCvJO8Gm+bXSLSWh+MP/AAUI+IsvjL9tvxpr+oLHdJaa41u6hj5cyQ4TbkHIBIPev1D/AOCQ/wAU/wBnn4ofBOSL4SfDnT/DusaUy2+vWlvH87NgkPvPzMD7mvxb1J/FnxE8Y3Or2Wm3Wo6lqt7JL5FrA0jSySPuPCgknJr9gP8Agi5+xb49/Zx+HOr/ABH+JdhJp+qeKmhaPS5fvW8CAld47MSxOO1fJcI1MZiM+qVowvCTk22tvQ/ofx2y3Iso8KcHga2I5cRSjCMIRlbm0XNeN9V5taH3VCZNmCKKjWQAcyfpRX6wfwkQ3Ii8jcwDcdx1r8Of+Cun7U2r/Ev9onWfh3o9jZWOh+Hr02lxFBZqJLmdTy7vjdweAAceua/cqSMGPYo9vpX5o/8ABS//AII7eLvir491P46fs6XcLX2pyebrGg3bFRLLjl4m7E9weK+X4swOOx+X8mF3vqurR+4eAmfcMZBxoq2cy5IuLUJP4Yyb6/8ABN3/AIIWftfWnjX4Zzfs2eLtQVdS8P5k0TzGG6a03fdH+636EV7b+3F+wp4n/aA8ZaB8VPgh41Xwj4u02b7PeeIIppBI1gwO6MKG2sc4IyK/J3wN8Kf2xv2FPiXpfxj1n4W6vpMej3ii4uLhf3Tpn5l3AnO4YHev2E0P9s3QPiT+x3qX7Q/w0eO6urLRpJpbNj80FwqElHHXhsfUV5/D+M+sZfLBY6LjKmtnu13R9N4p8OVeH+MIcQ8N1Izw+Jla6tKCnLdPpZ3vZnz98RfgF8E/+CcfhOy+K3irwtqXxV+ImvaulrpE2tYkaS7f+4MYjHHXGa9L+Bv/AAUI8e3PxN0n4S/tNfAmbwDd6+hXQpmuDJbyuBny93RWxnHPavLfjZdfF79pb/gnz4T/AGktc1iwvPFHhPVI/EKjTYdqyLGWBjI52naefpW1+2l4tvv2pP2M/h145+F3ha4vdY1jxJpb2lxp8e5rCX+N2ZR8oHzAmuynOpRqv2HuxUVJR0ad979bnzNajSzPBwhm0VUqynOnOrzNezkleKitIqNtdtT7A+JPwZ+H/AWNGXSvFmjeYsb77e6tZnhmhbGN6SIQynHfNeZ+Cf+CdH7PPgGSY6FH4h23Vx599G/ia723L5zlx5nzfj175rif+Chn7YvxT/Yh+Anhvxd4U0DTtU1G7uIrS+bUlcqP3fLfIRzkV8baR/wXx/af1WKNdO+GnhieaR9vkQw3DyH6KHz1rbMc8ynB4xUsRG9RJbK+5ycK+HfiNnuR1MZlE/9mu026iinZ+Z+mPxZ0rwD8KvgV4geHTrXSdPh0mZZPJh9VIHuT261+Qf7O/xdsvgH+0L4d+LOn295LC2stDcLDp+AYGJj4QDg4JPAyxHevcLv/gp9/wAFCfH2hSWt9+yNBqOm3MeHjOgXjLMD1GN38xXJ6N+09+1FoV7bajpH/BPTQ7a6WYSKy+ErokMDweuAev0rx8yxuFx1aFSCnDl1+Bn6RwTwznnC+W43B42FOs8QrP/Aaia1mtbt9T9ePC+tQa5oVprdskipdW6Sp5qlWAYAjIPQ81eedIl3ORx1wM1+Ydl/wAFRP8Ago6qloP2UVaNYiD/AMSG8UIw7D5jmqfif/grd/wUA8K6FJr/AIin/gZkLexsbfDXF9caRdpGoz3ywx1r2f9ZMJCCbjPbflZ+Xf8AEGuLa2IUKTowq+9rbU937aDep+pKTq43IflNRzylct5fA6jFfkpo/wDwXZ/at1y9j0vRfg94dvrhpAq29pHO7knoAobNdVJ/wVk/4KKGz+2N+yjEqjO5G0O8Jzn2NRS4sy7ERvCMmvKLNsV4F8dYOShiFSg+0qsE/wAWfpnY3q6qJnNoY1jl2ruXiQYHI/Hj8K+Cv+CtP7MPhXx74w8D6J4JC2WueL/EEdtfW8UWVuEXGZWX+8o7jGRwc156f+Ctv/BQzyxGP2To2m4+X+x7xVz1xyc1wviL9vj9tTVPjfpvxk8Wfsny3d9pmnvBo1q2kXbRWrOcu4/2zwDnoBx1NcuYZ3gsZh/YSpzadvss+i4P8OONuG85WPo1aUXGMrJVoau1kt++vyP0W/ZJ/Yv+FH7LPheOz8N2P2zV5o1N9rN3GvmyH+6MABFHZVAFeykgHdivyd8Q/8FdL9q7wbrX9j+L/AIIeG9PsbjYN9luIbhZORkcFhX29/wAE9P22fFv7ZfgC58Y654HsdLt7abZbtYyMyvjqfnGa9HJ88yvF1lhMDF8tr3asfG8eeHXHOVYSec5/KM6jaV4TUrJ7Ky2t29D4f8Z+K5tD/aC8fa/pPwn8Ua58QpvESx6Trd5pUq2FvAr/KySn5AoXqT2FfRH7KPwt/at8feMrbWf2k/i7rN7dTW8r6T4X0rUWitLGM8b5lTAY46A8Zr721bT9MksWkubdCsasW3DggDJ/lXwF/wUT+OPiL9kf9orw9+0D8L7m+eS80e4s9X0e4kP2a/jHKqAOjA85rxsbkKwcFi69ZyjF3t0v3fofomR+I7z+pDJMvy+FOrVgoKpf31bRQj0s/z8z5f/wCCkHw+t/D/AO3rrmm6rPdX0F5rFtLILy5aRmUhcruYk45PFfsH+x98BPhf8A/hDZ2Pw30KO1XVoI7m8upFzLMSgI3H2zivxG8dfGfxp8ev2hLf4jfEQwnUL/VoJJlhi2qoDDCgDsBxX7/fs/x3Mvwa8MtcLhv7EtcfTylxXDwtVwWYZtiatGPurl5b9j6Tx1wOe8McA5NgMxrXrxVTmSldXdtn2XQ7a3t0AwW/IUVYjXainHQUV+g83Rn8kt66H/9k=";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Universal Permissive CORS for cross-origin frontend hosting (Vercel, Localhost, Custom Domains)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));

// Enterprise ERP Rate Limiter with Dedicated Auth Brute-force Protection
const rateLimitWindowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 200; // 200 requests per IP per minute for standard APIs
const ipRequestLogs = {};

const authWindowMs = 15 * 60 * 1000; // 15 minutes
const maxAuthAttempts = 20; // 20 login attempts per 15 minutes
const authAttemptsLogs = {};

// Clean up memory cache periodically every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const ip in ipRequestLogs) {
    if (now - ipRequestLogs[ip].windowStart > rateLimitWindowMs) {
      delete ipRequestLogs[ip];
    }
  }
  for (const ip in authAttemptsLogs) {
    if (now - authAttemptsLogs[ip].windowStart > authWindowMs) {
      delete authAttemptsLogs[ip];
    }
  }
}, 5 * 60 * 1000);

const rateLimiter = (req, res, next) => {
  if (!req.path.startsWith('/api')) return next();

  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  // Stricter rate-limiting for login/auth
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    if (!authAttemptsLogs[ip]) {
      authAttemptsLogs[ip] = { windowStart: now, count: 1 };
    } else {
      const authLog = authAttemptsLogs[ip];
      if (now - authLog.windowStart > authWindowMs) {
        authLog.windowStart = now;
        authLog.count = 1;
      } else {
        authLog.count += 1;
        if (authLog.count > maxAuthAttempts) {
          return res.status(429).json({
            error: '🔒 Security Alert: Too many login attempts. Account temporarily locked for 15 minutes.'
          });
        }
      }
    }
  }

  // Standard API rate limiter
  if (!ipRequestLogs[ip]) {
    ipRequestLogs[ip] = { windowStart: now, requestCount: 1 };
    return next();
  }

  const clientLog = ipRequestLogs[ip];
  if (now - clientLog.windowStart > rateLimitWindowMs) {
    clientLog.windowStart = now;
    clientLog.requestCount = 1;
    return next();
  }

  clientLog.requestCount += 1;
  if (clientLog.requestCount > maxRequestsPerWindow) {
    return res.status(429).json({
      error: '⚠️ Rate limit exceeded. Please slow down and try again.'
    });
  }

  next();
};

app.use(rateLimiter);

// Serve built React frontend files directly on Port 5000
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// PWA Web App Manifest endpoint for Android & iOS App Install
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    short_name: "SKC ERP",
    name: "Sri Krishna Constructions ERP",
    description: "Official Enterprise Construction Management & Payroll Portal",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ],
    start_url: "/",
    background_color: "#0f172a",
    theme_color: "#1e3a8a",
    display: "standalone",
    orientation: "portrait"
  });
});

// PWA Service Worker script
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    const CACHE_NAME = 'skc-erp-v1';
    self.addEventListener('install', (e) => {
      self.skipWaiting();
    });
    self.addEventListener('activate', (e) => {
      e.waitUntil(self.clients.claim());
    });
    self.addEventListener('fetch', (e) => {
      // Pass through fetch for fresh data
      return;
    });
  `);
});

// Middleware: Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Middleware: Authorization (Roles)
const requireRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of roles: ${roles.join(', ')}` });
    }
    next();
  };
};

// Serve extracted HD SKC Logo directly
app.get('/api/logo/skc-logo', async (req, res) => {
  try {
    const filePath = 'C:\\Users\\maju\\Downloads\\SKC LOGO.xlsx';
    if (fs.existsSync(filePath)) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      if (workbook.media && workbook.media.length > 0) {
        const media = workbook.media[0];
        res.setHeader('Content-Type', `image/${media.extension || 'png'}`);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(media.buffer);
      }
    }

    // Cloud production: Serve embedded base64 image as binary buffer
    const base64Data = SKC_LOGO_BASE64.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(imgBuffer);
  } catch (err) {
    console.error('Error serving SKC logo:', err.message);
    res.status(500).json({ error: 'Failed to serve logo' });
  }
});

// Serve extracted HD SKC Logo as Base64 JSON
app.get('/api/logo/base64', async (req, res) => {
  try {
    const filePath = 'C:\\Users\\maju\\Downloads\\SKC LOGO.xlsx';
    if (fs.existsSync(filePath)) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      if (workbook.media && workbook.media.length > 0) {
        const media = workbook.media[0];
        const base64Data = `data:image/${media.extension || 'png'};base64,${Buffer.from(media.buffer).toString('base64')}`;
        return res.json({ success: true, base64: base64Data });
      }
    }

    // Cloud production: Serve embedded SKC_LOGO_BASE64
    return res.json({ success: true, base64: SKC_LOGO_BASE64 });
  } catch (err) {
    console.error('Base64 logo error:', err.message);
    res.json({ success: true, base64: SKC_LOGO_BASE64 });
  }
});

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Search for user case-insensitively
    let { rows } = await pool.query(
      `SELECT * FROM "User" WHERE LOWER("username") = $1 LIMIT 1`,
      [trimmedUsername]
    );

    let user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 2. Check password: match via bcrypt OR plain text fallback
    let validPassword = false;
    try {
      validPassword = await bcrypt.compare(cleanPassword, user.password);
    } catch (e) {
      validPassword = false;
    }

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT "id", "username", "fullName", "mobileNumber", "role" FROM "User" WHERE "id" = $1 LIMIT 1`,
      [req.user.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Fetch me error:', err);
    res.status(500).json({ error: 'Failed to fetch user session' });
  }
});

// --- DASHBOARD DAILY STATS API (TODAY'S PURCHASES, SALES & ATTENDANCE) ---
app.get('/api/dashboard/daily-stats', authenticateToken, async (req, res) => {
  try {
    // Use IST (UTC+5:30) for accurate "today" boundary
    const nowIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
    const todayStr = nowIST.toISOString().split('T')[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    // 1. Today's Purchases (Inward)
    const todayPurchases = await pool.query(`
      SELECT 
        COALESCE(SUM(qty), 0)::float as "totalQty",
        COALESCE(SUM("totalAmount"), 0)::float as "totalAmount",
        COUNT(*)::int as "count"
      FROM "Purchase"
      WHERE "date" >= $1 AND "date" <= $2
    `, [todayStart, todayEnd]);

    // 2. Today's Sales (Dispatched)
    const todaySales = await pool.query(`
      SELECT 
        COALESCE(SUM(qty), 0)::float as "totalQty",
        COALESCE(SUM("totalAmount"), 0)::float as "totalAmount",
        COUNT(*)::int as "count"
      FROM "Sale"
      WHERE "invoiceDate" >= $1 AND "invoiceDate" <= $2
    `, [todayStart, todayEnd]);

    // 3. Today's Attendance (supporting both overtimeHours and otHours column naming)
    const todayAttendance = await pool.query(`
      SELECT 
        COUNT(*)::int as "totalMarked",
        COUNT(*) FILTER (WHERE status = 'PRESENT')::int as "presentCount",
        COUNT(*) FILTER (WHERE status = 'ABSENT')::int as "absentCount",
        COUNT(*) FILTER (WHERE status = 'HALF_DAY')::int as "halfDayCount",
        COALESCE(SUM("overtimeHours"), 0)::float as "totalOtHours"
      FROM "Attendance"
      WHERE "date" >= $1 AND "date" <= $2
    `, [todayStart, todayEnd]);

    // 4. Total Workers Registered
    const totalWorkersRes = await pool.query(`SELECT COUNT(*)::int as count FROM "Worker"`);

    res.json({
      todayPurchases: todayPurchases.rows[0] || { totalQty: 0, totalAmount: 0, count: 0 },
      todaySales: todaySales.rows[0] || { totalQty: 0, totalAmount: 0, count: 0 },
      todayAttendance: todayAttendance.rows[0] || { totalMarked: 0, presentCount: 0, absentCount: 0, halfDayCount: 0, totalOtHours: 0 },
      totalWorkers: totalWorkersRes.rows[0]?.count || 0
    });
  } catch (err) {
    console.error('Error fetching dashboard daily stats:', err);
    res.status(200).json({
      todayPurchases: { totalQty: 0, totalAmount: 0, count: 0 },
      todaySales: { totalQty: 0, totalAmount: 0, count: 0 },
      todayAttendance: { totalMarked: 0, presentCount: 0, absentCount: 0, halfDayCount: 0, totalOtHours: 0 },
      totalWorkers: 0
    });
  }
});

// --- PO AND INVENTORY APIS (DIRECT POSTGRESQL LAYER) ---

// POST /api/purchase-orders - Create PO (Owner/Manager only)
app.post('/api/purchase-orders', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { poNumber, date, divisionId, poAmount, remarks } = req.body;
    if (!poNumber || !poNumber.trim()) {
      return res.status(400).json({ error: 'Purchase Order number is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Purchase Order date is required' });
    }
    if (!divisionId) {
      return res.status(400).json({ error: 'Division selection is required' });
    }

    const result = await pool.query(
      `INSERT INTO "PurchaseOrder" ("id", "poNumber", "date", "divisionId", "poAmount", "remarks", "addedById", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [poNumber.trim(), new Date(date), divisionId, parseFloat(poAmount) || 0, remarks ? remarks.trim() : null, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating purchase order:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: `Purchase Order '${req.body.poNumber}' already exists.` });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Selected division is invalid or does not exist.' });
    }
    res.status(500).json({ error: 'Failed to create PO' });
  }
});

// GET /api/purchase-orders - List all POs with cursor pagination
app.get('/api/purchase-orders', authenticateToken, async (req, res) => {
  try {
    const { cursor, limit = 20, search, dateFrom, dateTo } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [];
    let params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`po."poNumber" ILIKE $${params.length}`);
    }
    if (dateFrom) {
      params.push(new Date(dateFrom));
      whereClauses.push(`po."date" >= $${params.length}`);
    }
    if (dateTo) {
      params.push(new Date(dateTo));
      whereClauses.push(`po."date" <= $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM "PurchaseOrder" po ${whereSql}`, params);
    const totalCount = countRes.rows[0]?.count || 0;

    let cursorWhere = whereSql;
    const queryParams = [...params];
    if (cursor) {
      queryParams.push(cursor);
      cursorWhere += (whereClauses.length > 0 ? ' AND ' : 'WHERE ') + `po."id" < $${queryParams.length}`;
    }

    queryParams.push(limitNum + 1);
    const querySql = `
      SELECT 
        po.*,
        json_build_object('name', d.name) as division,
        json_build_object('fullName', u."fullName") as "addedBy",
        json_build_object('items', COALESCE((SELECT COUNT(*)::int FROM "PurchaseOrderItem" poi WHERE poi."purchaseOrderId" = po.id), 0)) as "_count"
      FROM "PurchaseOrder" po
      LEFT JOIN "Division" d ON po."divisionId" = d.id
      LEFT JOIN "User" u ON po."addedById" = u.id
      ${cursorWhere}
      ORDER BY po."id" DESC
      LIMIT $${queryParams.length}
    `;

    const { rows } = await pool.query(querySql, queryParams);
    let nextCursor = null;
    if (rows.length > limitNum) {
      const extra = rows.pop();
      nextCursor = extra.id;
    }

    res.json({ purchaseOrders: rows, nextCursor, totalCount });
  } catch (err) {
    console.error('Error listing POs:', err);
    res.status(500).json({ error: 'Failed to list POs' });
  }
});

// GET /api/purchase-orders/:id - Get PO header and KPI financial metrics
app.get('/api/purchase-orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const poRes = await pool.query(`
      SELECT 
        po.*,
        json_build_object('name', d.name) as division,
        json_build_object('fullName', u."fullName") as "addedBy",
        json_build_object('items', COALESCE((SELECT COUNT(*)::int FROM "PurchaseOrderItem" poi WHERE poi."purchaseOrderId" = po.id), 0)) as "_count"
      FROM "PurchaseOrder" po
      LEFT JOIN "Division" d ON po."divisionId" = d.id
      LEFT JOIN "User" u ON po."addedById" = u.id
      WHERE po.id = $1
    `, [id]);

    if (poRes.rows.length === 0) return res.status(404).json({ error: 'PO not found' });
    const purchaseOrder = poRes.rows[0];

    const kpiRes = await pool.query(`
      SELECT 
        COALESCE(SUM(poi.qty), 0)::float as "totalOrderedQty",
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" IN (SELECT id FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1)), 0)::float as "totalInwardQty",
        COALESCE((SELECT SUM(pur."totalAmount") FROM "Purchase" pur WHERE pur."purchaseOrderItemId" IN (SELECT id FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1)), 0)::float as "totalInwardValue",
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" IN (SELECT id FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1)), 0)::float as "totalSoldQty",
        COALESCE((SELECT SUM(s."totalAmount") FROM "Sale" s WHERE s."purchaseOrderItemId" IN (SELECT id FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1)), 0)::float as "totalSalesValue",
        COUNT(DISTINCT poi.id)::int as "totalItemsCount"
      FROM "PurchaseOrderItem" poi
      WHERE poi."purchaseOrderId" = $1
    `, [id]);

    const kpiRow = kpiRes.rows[0] || {};
    const totalOrderedQty = kpiRow.totalOrderedQty || 0;
    const totalInwardQty = kpiRow.totalInwardQty || 0;
    const progressPercent = totalOrderedQty > 0 ? Math.min(100, Math.round((totalInwardQty / totalOrderedQty) * 100)) : 0;

    const remainingInwardQty = Math.max(0, totalOrderedQty - totalInwardQty);
    const totalSoldQty = kpiRow.totalSoldQty || 0;
    const availableForSaleQty = Math.max(0, totalInwardQty - totalSoldQty);

    const kpi = {
      totalPoAmount: purchaseOrder.poAmount || 0,
      totalInwardValue: kpiRow.totalInwardValue || 0,
      totalSalesValue: kpiRow.totalSalesValue || 0,
      totalOrderedQty,
      totalInwardQty,
      remainingInwardQty,
      totalSoldQty,
      availableForSaleQty,
      totalItemsCount: kpiRow.totalItemsCount || 0,
      progressPercent
    };

    res.json({ purchaseOrder, kpi });
  } catch (err) {
    console.error('Error fetching PO details:', err);
    res.status(500).json({ error: 'Failed to get PO' });
  }
});

// GET /api/purchase-orders/:id/items - Fast cursor paginated items
app.get('/api/purchase-orders/:id/items', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 20, search, partNumber, kpclCode } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [`poi."purchaseOrderId" = $1`];
    let params = [id];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(poi."partNumber" ILIKE $${params.length} OR poi."kpclCode" ILIKE $${params.length} OR poi."itemName" ILIKE $${params.length})`);
    }
    if (partNumber) {
      params.push(`%${partNumber}%`);
      whereClauses.push(`poi."partNumber" ILIKE $${params.length}`);
    }
    if (kpclCode) {
      params.push(`%${kpclCode}%`);
      whereClauses.push(`poi."kpclCode" ILIKE $${params.length}`);
    }

    const whereSql = 'WHERE ' + whereClauses.join(' AND ');

    const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM "PurchaseOrderItem" poi ${whereSql}`, params);
    const totalCount = countRes.rows[0]?.count || 0;

    let cursorWhere = whereSql;
    const queryParams = [...params];
    if (cursor) {
      queryParams.push(cursor);
      cursorWhere += ` AND poi."id" > $${queryParams.length}`;
    }

    queryParams.push(limitNum + 1);
    const querySql = `
      SELECT 
        poi.*,
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as "purchasedQty",
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)::float as "soldQty"
      FROM "PurchaseOrderItem" poi
      ${cursorWhere}
      ORDER BY poi."id" ASC
      LIMIT $${queryParams.length}
    `;

    const { rows } = await pool.query(querySql, queryParams);
    let nextCursor = null;
    if (rows.length > limitNum) {
      const extraItem = rows.pop();
      nextCursor = extraItem.id;
    }

    const itemsWithAgg = rows.map(item => ({
      ...item,
      remainingQty: (item.qty || 0) - item.purchasedQty,
      availableForSale: item.purchasedQty - item.soldQty
    }));

    res.json({ items: itemsWithAgg, nextCursor, totalCount });
  } catch (err) {
    console.error('Error fetching PO items:', err);
    res.status(500).json({ error: 'Failed to list PO items' });
  }
});

// GET /api/purchase-orders/:id/purchases - Inward records
app.get('/api/purchase-orders/:id/purchases', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 20, partNumber, dateFrom, dateTo } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [`poi."purchaseOrderId" = $1`];
    let params = [id];

    if (partNumber) {
      params.push(`%${partNumber}%`);
      whereClauses.push(`poi."partNumber" ILIKE $${params.length}`);
    }
    if (dateFrom) {
      params.push(new Date(dateFrom));
      whereClauses.push(`pur."date" >= $${params.length}`);
    }
    if (dateTo) {
      params.push(new Date(dateTo));
      whereClauses.push(`pur."date" <= $${params.length}`);
    }

    const whereSql = 'WHERE ' + whereClauses.join(' AND ');

    const countRes = await pool.query(`
      SELECT COUNT(*)::int as count 
      FROM "Purchase" pur
      JOIN "PurchaseOrderItem" poi ON pur."purchaseOrderItemId" = poi.id
      ${whereSql}
    `, params);
    const totalCount = countRes.rows[0]?.count || 0;

    let cursorWhere = whereSql;
    const queryParams = [...params];
    if (cursor) {
      queryParams.push(cursor);
      cursorWhere += ` AND pur."id" < $${queryParams.length}`;
    }

    queryParams.push(limitNum + 1);
    const querySql = `
      SELECT 
        pur.*,
        json_build_object('id', poi.id, 'partNumber', poi."partNumber", 'itemName', poi."itemName", 'kpclCode', poi."kpclCode") as "purchaseOrderItem",
        json_build_object('fullName', u."fullName") as "addedBy"
      FROM "Purchase" pur
      JOIN "PurchaseOrderItem" poi ON pur."purchaseOrderItemId" = poi.id
      LEFT JOIN "User" u ON pur."addedById" = u.id
      ${cursorWhere}
      ORDER BY pur."id" DESC
      LIMIT $${queryParams.length}
    `;

    const { rows } = await pool.query(querySql, queryParams);
    let nextCursor = null;
    if (rows.length > limitNum) {
      const extra = rows.pop();
      nextCursor = extra.id;
    }

    res.json({ purchases: rows, nextCursor, totalCount });
  } catch (err) {
    console.error('Error listing purchases:', err);
    res.status(500).json({ error: 'Failed to list purchases' });
  }
});

// GET /api/purchase-orders/:id/sales - Outward sale records
app.get('/api/purchase-orders/:id/sales', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 20, invoiceNumber, partNumber, dateFrom, dateTo } = req.query;
    const limitNum = parseInt(limit, 10) || 20;

    let whereClauses = [`poi."purchaseOrderId" = $1`];
    let params = [id];

    if (invoiceNumber) {
      params.push(`%${invoiceNumber}%`);
      whereClauses.push(`s."invoiceNumber" ILIKE $${params.length}`);
    }
    if (partNumber) {
      params.push(`%${partNumber}%`);
      whereClauses.push(`poi."partNumber" ILIKE $${params.length}`);
    }
    if (dateFrom) {
      params.push(new Date(dateFrom));
      whereClauses.push(`s."invoiceDate" >= $${params.length}`);
    }
    if (dateTo) {
      params.push(new Date(dateTo));
      whereClauses.push(`s."invoiceDate" <= $${params.length}`);
    }

    const whereSql = 'WHERE ' + whereClauses.join(' AND ');

    const countRes = await pool.query(`
      SELECT COUNT(*)::int as count 
      FROM "Sale" s
      JOIN "PurchaseOrderItem" poi ON s."purchaseOrderItemId" = poi.id
      ${whereSql}
    `, params);
    const totalCount = countRes.rows[0]?.count || 0;

    let cursorWhere = whereSql;
    const queryParams = [...params];
    if (cursor) {
      queryParams.push(cursor);
      cursorWhere += ` AND s."id" < $${queryParams.length}`;
    }

    queryParams.push(limitNum + 1);
    const querySql = `
      SELECT 
        s.*,
        json_build_object('id', poi.id, 'partNumber', poi."partNumber", 'itemName', poi."itemName", 'kpclCode', poi."kpclCode") as "purchaseOrderItem",
        json_build_object('fullName', u."fullName") as "addedBy"
      FROM "Sale" s
      JOIN "PurchaseOrderItem" poi ON s."purchaseOrderItemId" = poi.id
      LEFT JOIN "User" u ON s."addedById" = u.id
      ${cursorWhere}
      ORDER BY s."id" DESC
      LIMIT $${queryParams.length}
    `;

    const { rows } = await pool.query(querySql, queryParams);
    let nextCursor = null;
    if (rows.length > limitNum) {
      const extra = rows.pop();
      nextCursor = extra.id;
    }

    res.json({ sales: rows, nextCursor, totalCount });
  } catch (err) {
    console.error('Error listing sales:', err);
    res.status(500).json({ error: 'Failed to list sales' });
  }
});

// PUT /api/purchase-orders/:id - Update PO header & Remarks
app.put('/api/purchase-orders/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { poNumber, date, divisionId, poAmount, remarks } = req.body;
    const { rows } = await pool.query(
      `UPDATE "PurchaseOrder"
       SET "poNumber" = COALESCE($1, "poNumber"),
           "date" = COALESCE($2, "date"),
           "divisionId" = COALESCE($3, "divisionId"),
           "poAmount" = COALESCE($4, "poAmount"),
           "remarks" = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE "remarks" END,
           "updatedAt" = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        poNumber !== undefined ? poNumber?.trim() : null,
        date ? new Date(date) : null,
        divisionId || null,
        poAmount !== undefined ? parseFloat(poAmount) : null,
        remarks !== undefined ? remarks : null,
        req.params.id
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'PO not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating PO:', err);
    res.status(500).json({ error: 'Failed to update PO' });
  }
});

// DELETE /api/purchase-orders/:id - Delete PO
app.delete('/api/purchase-orders/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    await pool.query(`DELETE FROM "PurchaseOrder" WHERE id = $1`, [req.params.id]);
    res.json({ message: 'PO deleted successfully' });
  } catch (err) {
    console.error('Error deleting PO:', err);
    res.status(500).json({ error: 'Failed to delete PO' });
  }
});

// POST /api/purchase-order-items - Add item to PO
app.post('/api/purchase-order-items', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const basicAmount = parseFloat(d.basicAmount) || (qty * rate);
    const discount = parseFloat(d.discount) || 0;
    const freight = parseFloat(d.freight) || 0;
    const pAndF = parseFloat(d.pAndF) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;
    const cgstAmount = parseFloat(d.cgstAmount) || (basicAmount * (cgstPercent / 100));
    const sgstAmount = parseFloat(d.sgstAmount) || (basicAmount * (sgstPercent / 100));
    const igstAmount = parseFloat(d.igstAmount) || (basicAmount * (igstPercent / 100));
    const insurance = parseFloat(d.insurance) || 0;
    const totalAmount = parseFloat(d.totalAmount) || (basicAmount + cgstAmount + sgstAmount + igstAmount - discount + freight + pAndF + insurance);

    const { rows } = await pool.query(
      `INSERT INTO "PurchaseOrderItem" (
        "id", "purchaseOrderId", "kpclCode", "itemName", "specifications", "partNumber", "make", "hsnCode", "unit",
        "qty", "rate", "basicAmount", "discount", "freight", "pAndF", "cgstPercent", "sgstPercent", "igstPercent",
        "cgstAmount", "sgstAmount", "igstAmount", "insurance", "totalAmount", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, NOW(), NOW()
      ) RETURNING *`,
      [
        d.purchaseOrderId, d.kpclCode, d.itemName, d.specifications || null, d.partNumber, d.make || null, d.hsnCode || null, d.unit || 'NOS',
        qty, rate, basicAmount, discount, freight, pAndF, cgstPercent, sgstPercent, igstPercent,
        cgstAmount, sgstAmount, igstAmount, insurance, totalAmount
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error adding PO item:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Part number must be unique across POs' });
    }
    res.status(500).json({ error: 'Failed to add PO item' });
  }
});

// PUT /api/purchase-order-items/:id - Update item
app.put('/api/purchase-order-items/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const basicAmount = qty * rate;
    const discount = parseFloat(d.discount) || 0;
    const freight = parseFloat(d.freight) || 0;
    const pAndF = parseFloat(d.pAndF) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;
    const taxableAmount = Math.max(0, basicAmount - discount + freight + pAndF);
    const cgstAmount = taxableAmount * (cgstPercent / 100);
    const sgstAmount = taxableAmount * (sgstPercent / 100);
    const igstAmount = taxableAmount * (igstPercent / 100);
    const insurance = parseFloat(d.insurance) || 0;
    const totalAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount + insurance;

    const { rows } = await pool.query(
      `UPDATE "PurchaseOrderItem"
       SET "partNumber" = COALESCE($1, "partNumber"),
           "kpclCode" = COALESCE($2, "kpclCode"),
           "itemName" = COALESCE($3, "itemName"),
           "specifications" = COALESCE($4, "specifications"),
           "make" = COALESCE($5, "make"),
           "hsnCode" = COALESCE($6, "hsnCode"),
           "unit" = COALESCE($7, "unit"),
           "qty" = $8,
           "rate" = $9,
           "basicAmount" = $10,
           "discount" = $11,
           "freight" = $12,
           "pAndF" = $13,
           "cgstPercent" = $14,
           "sgstPercent" = $15,
           "igstPercent" = $16,
           "cgstAmount" = $17,
           "sgstAmount" = $18,
           "igstAmount" = $19,
           "insurance" = $20,
           "totalAmount" = $21,
           "updatedAt" = NOW()
       WHERE id = $22
       RETURNING *`,
      [
        d.partNumber || null, d.kpclCode || null, d.itemName || null, d.specifications || null, d.make || null, d.hsnCode || null, d.unit || 'NOS',
        qty, rate, basicAmount, discount, freight, pAndF,
        cgstPercent, sgstPercent, igstPercent,
        cgstAmount, sgstAmount, igstAmount, insurance, totalAmount,
        req.params.id
      ]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating PO item:', err);
    res.status(500).json({ error: 'Failed to update PO item' });
  }
});

// DELETE /api/purchase-order-items/:id - Delete item
app.delete('/api/purchase-order-items/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const checkRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM "Purchase" WHERE "purchaseOrderItemId" = $1) as purchases,
        (SELECT COUNT(*)::int FROM "Sale" WHERE "purchaseOrderItemId" = $1) as sales
    `, [req.params.id]);

    if (checkRes.rows[0]?.purchases > 0 || checkRes.rows[0]?.sales > 0) {
      return res.status(400).json({ error: 'Cannot delete item with existing purchases or sales' });
    }
    await pool.query(`DELETE FROM "PurchaseOrderItem" WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Error deleting PO item:', err);
    res.status(500).json({ error: 'Failed to delete PO item' });
  }
});

// POST /api/purchases - Inward purchase record with ACID transactional safety
app.post('/api/purchases', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount;

    await client.query('BEGIN');

    // Row-level lock on item to prevent race conditions during high concurrency
    const itemRes = await client.query(`
      SELECT poi.qty, COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as purchased
      FROM "PurchaseOrderItem" poi
      WHERE poi.id = $1
      FOR UPDATE
    `, [d.purchaseOrderItemId]);

    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'PO item not found' });
    }
    const item = itemRes.rows[0];
    if (qty > (item.qty - item.purchased)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Quantity (${qty}) exceeds remaining order balance (${item.qty - item.purchased})` });
    }

    const { rows } = await client.query(
      `INSERT INTO "Purchase" (
        "id", "purchaseOrderItemId", "date", "qty", "rate", "basicAmount",
        "cgstPercent", "sgstPercent", "igstPercent", "cgstAmount", "sgstAmount", "igstAmount",
        "totalAmount", "partyName", "supplierAddress", "gstNumber", "partyInvoiceNumber",
        "supplierInvoiceDate", "vehicleNumber", "remarks", "addedById", "createdAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20, NOW()
      ) RETURNING *`,
      [
        d.purchaseOrderItemId, new Date(d.date), qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount,
        totalAmount,
        d.partyName ? d.partyName.trim() : null,
        d.supplierAddress ? d.supplierAddress.trim() : null,
        d.gstNumber ? d.gstNumber.trim().toUpperCase() : null,
        d.partyInvoiceNumber ? d.partyInvoiceNumber.trim().toUpperCase() : null,
        d.supplierInvoiceDate ? new Date(d.supplierInvoiceDate) : null,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        req.user.id
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating purchase:', err);
    res.status(500).json({ error: 'Failed to record purchase' });
  } finally {
    client.release();
  }
});

// PUT /api/purchases/:id - Update purchase
app.put('/api/purchases/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount;

    const { rows } = await pool.query(
      `UPDATE "Purchase"
       SET "qty" = $1, "rate" = $2, "basicAmount" = $3,
           "cgstPercent" = $4, "sgstPercent" = $5, "igstPercent" = $6,
           "cgstAmount" = $7, "sgstAmount" = $8, "igstAmount" = $9,
           "totalAmount" = $10, "date" = $11,
           "partyName" = $12, "supplierAddress" = $13, "gstNumber" = $14,
           "partyInvoiceNumber" = $15, "supplierInvoiceDate" = $16,
           "vehicleNumber" = $17, "remarks" = $18
       WHERE id = $19
       RETURNING *`,
      [
        qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent,
        cgstAmount, sgstAmount, igstAmount,
        totalAmount, d.date ? new Date(d.date) : new Date(),
        d.partyName ? d.partyName.trim() : null,
        d.supplierAddress ? d.supplierAddress.trim() : null,
        d.gstNumber ? d.gstNumber.trim().toUpperCase() : null,
        d.partyInvoiceNumber ? d.partyInvoiceNumber.trim().toUpperCase() : null,
        d.supplierInvoiceDate ? new Date(d.supplierInvoiceDate) : null,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        id
      ]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Purchase record not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating purchase:', err);
    res.status(500).json({ error: 'Failed to update purchase record' });
  }
});

// DELETE /api/purchases/:id - Delete purchase
app.delete('/api/purchases/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM "Purchase" WHERE id = $1`, [id]);
    res.json({ message: 'Purchase record deleted successfully' });
  } catch (err) {
    console.error('Error deleting purchase:', err);
    res.status(500).json({ error: 'Failed to delete purchase' });
  }
});

// POST /api/sales - Outward sale record with ACID transactional safety
// POST /api/sales - Outward sale record with ACID transactional safety & mandatory Owner approval
app.post('/api/sales', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  const client = await pool.connect();
  try {
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount;

    await client.query('BEGIN');

    // Row-level lock on item to prevent overselling race conditions
    const stockRes = await client.query(`
      SELECT 
        poi."partNumber", poi."itemName",
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as purchased,
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id AND s.status = 'APPROVED'), 0)::float as sold
      FROM "PurchaseOrderItem" poi
      WHERE poi.id = $1
      FOR UPDATE
    `, [d.purchaseOrderItemId]);

    const partNumber = stockRes.rows[0]?.partNumber || '-';
    const itemName = stockRes.rows[0]?.itemName || '-';
    const purchased = stockRes.rows[0]?.purchased || 0;
    const sold = stockRes.rows[0]?.sold || 0;
    const available = purchased - sold;
    if (qty > available) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Sale quantity (${qty}) exceeds available approved stock (${available})` });
    }

    const saleId = (await client.query('SELECT gen_random_uuid()::text as id')).rows[0].id;

    // EVERY sale requires Owner approval (even if created by Owner/Manager)
    const { rows } = await client.query(
      `INSERT INTO "Sale" (
        "id", "purchaseOrderItemId", "invoiceNumber", "invoiceDate", "qty", "rate", "basicAmount",
        "cgstPercent", "sgstPercent", "igstPercent", "cgstAmount", "sgstAmount", "igstAmount",
        "totalAmount", "partyName", "supplierAddress", "gstNumber", "companyGstNumber", "partyInvoiceNumber",
        "supplierInvoiceDate", "vehicleNumber", "remarks", "status", "addedById", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, 'PENDING', $23, NOW()
      ) RETURNING *`,
      [
        saleId, d.purchaseOrderItemId, d.invoiceNumber ? d.invoiceNumber.trim().toUpperCase() : null,
        d.invoiceDate ? new Date(d.invoiceDate) : new Date(),
        qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount,
        totalAmount,
        d.partyName ? d.partyName.trim() : null,
        d.supplierAddress ? d.supplierAddress.trim() : null,
        d.gstNumber ? d.gstNumber.trim().toUpperCase() : null,
        d.companyGstNumber ? d.companyGstNumber.trim().toUpperCase() : null,
        d.partyInvoiceNumber ? d.partyInvoiceNumber.trim().toUpperCase() : null,
        d.supplierInvoiceDate ? new Date(d.supplierInvoiceDate) : null,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        req.user.id
      ]
    );

    // Ensure SALE_ENTRY is in ApprovalType enum
    try {
      await client.query(`ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'SALE_ENTRY'`);
    } catch (_) {}

    // Automatically create an Approval Request for OWNER review
    await client.query(
      `INSERT INTO "ApprovalRequest" ("id", "type", "status", "requestedById", "payload", "reason", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, 'SALE_ENTRY', 'PENDING', $1, $2, $3, NOW(), NOW())`,
      [
        req.user.id,
        JSON.stringify({
          saleId: saleId,
          partNumber: partNumber,
          itemName: itemName,
          invoiceNumber: d.invoiceNumber || '-',
          invoiceDate: d.invoiceDate,
          qty: qty,
          rate: rate,
          basicAmount: basicAmount,
          cgstPercent: cgstPercent,
          sgstPercent: sgstPercent,
          igstPercent: igstPercent,
          cgstAmount: cgstAmount,
          sgstAmount: sgstAmount,
          igstAmount: igstAmount,
          totalAmount: totalAmount,
          partyName: d.partyName || '-',
          supplierAddress: d.supplierAddress || '-',
          companyGstNumber: d.companyGstNumber || '-',
          gstNumber: d.gstNumber || '-',
          partyInvoiceNumber: d.partyInvoiceNumber || '-',
          supplierInvoiceDate: d.supplierInvoiceDate || null,
          vehicleNumber: d.vehicleNumber || '-',
          remarks: d.remarks || '-'
        }),
        `Sale Invoice #${d.invoiceNumber || '-'} (${qty} units of ${partNumber}) submitted for Owner Approval`
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Sale recorded and submitted for Owner Approval',
      sale: rows[0]
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Error recording sale:', err);
    res.status(500).json({ error: err.message || 'Failed to record sale' });
  } finally {
    client.release();
  }
});

// PUT /api/sales/:id - Update sale (Only Owner can update approved, or pending can be updated)
app.put('/api/sales/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body;
    const qty = parseFloat(d.qty) || 0;
    const rate = parseFloat(d.rate) || 0;
    const cgstPercent = parseFloat(d.cgstPercent) || 0;
    const sgstPercent = parseFloat(d.sgstPercent) || 0;
    const igstPercent = parseFloat(d.igstPercent) || 0;

    const basicAmount = qty * rate;
    const cgstAmount = basicAmount * (cgstPercent / 100);
    const sgstAmount = basicAmount * (sgstPercent / 100);
    const igstAmount = basicAmount * (igstPercent / 100);
    const totalAmount = basicAmount + cgstAmount + sgstAmount + igstAmount;

    const { rows } = await pool.query(
      `UPDATE "Sale"
       SET "invoiceNumber" = COALESCE($1, "invoiceNumber"),
           "invoiceDate" = $2, "qty" = $3, "rate" = $4, "basicAmount" = $5,
           "cgstPercent" = $6, "sgstPercent" = $7, "igstPercent" = $8,
           "cgstAmount" = $9, "sgstAmount" = $10, "igstAmount" = $11,
           "totalAmount" = $12,
           "partyName" = $13, "supplierAddress" = $14, "gstNumber" = $15,
           "companyGstNumber" = $16,
           "partyInvoiceNumber" = $17, "supplierInvoiceDate" = $18,
           "vehicleNumber" = $19, "remarks" = $20
       WHERE id = $21
       RETURNING *`,
      [
        d.invoiceNumber ? d.invoiceNumber.trim().toUpperCase() : null,
        d.invoiceDate ? new Date(d.invoiceDate) : new Date(),
        qty, rate, basicAmount,
        cgstPercent, sgstPercent, igstPercent, cgstAmount, sgstAmount, igstAmount,
        totalAmount,
        d.partyName ? d.partyName.trim() : null,
        d.supplierAddress ? d.supplierAddress.trim() : null,
        d.gstNumber ? d.gstNumber.trim().toUpperCase() : null,
        d.companyGstNumber ? d.companyGstNumber.trim().toUpperCase() : null,
        d.partyInvoiceNumber ? d.partyInvoiceNumber.trim().toUpperCase() : null,
        d.supplierInvoiceDate ? new Date(d.supplierInvoiceDate) : null,
        d.vehicleNumber ? d.vehicleNumber.trim().toUpperCase() : null,
        d.remarks ? d.remarks.trim() : null,
        id
      ]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Sale record not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating sale:', err);
    res.status(500).json({ error: 'Failed to update sale record' });
  }
});

// DELETE /api/sales/:id - Delete sale
app.delete('/api/sales/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    await pool.query(`DELETE FROM "Sale" WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Sale invoice record deleted successfully' });
  } catch (err) {
    console.error('Error deleting sale:', err);
    res.status(500).json({ error: 'Failed to delete sale' });
  }
});

// GET /api/stock-summary - Aggregated stock view with dual-join and dictionary lookup
app.get('/api/stock-summary', authenticateToken, async (req, res) => {
  try {
    const { search, poNumber, partNumber, kpclCode, itemName, make, stockStatus, dateFrom, dateTo, cursor, limit = 50 } = req.query;
    const limitNum = parseInt(limit, 10) || 50;

    let whereClauses = [];
    let params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(poi."partNumber" ILIKE $${params.length} OR poi."itemName" ILIKE $${params.length} OR poi."kpclCode" ILIKE $${params.length} OR po."poNumber" ILIKE $${params.length} OR poi.make ILIKE $${params.length})`);
    }
    if (poNumber) {
      params.push(`%${poNumber}%`);
      whereClauses.push(`po."poNumber" ILIKE $${params.length}`);
    }
    if (partNumber) {
      params.push(`%${partNumber}%`);
      whereClauses.push(`poi."partNumber" ILIKE $${params.length}`);
    }
    if (kpclCode) {
      params.push(`%${kpclCode}%`);
      whereClauses.push(`poi."kpclCode" ILIKE $${params.length}`);
    }
    if (itemName) {
      params.push(`%${itemName}%`);
      whereClauses.push(`poi."itemName" ILIKE $${params.length}`);
    }
    if (make) {
      params.push(`%${make}%`);
      whereClauses.push(`poi.make ILIKE $${params.length}`);
    }
    if (dateFrom) {
      params.push(new Date(dateFrom));
      whereClauses.push(`po."date" >= $${params.length}`);
    }
    if (dateTo) {
      const dTo = new Date(dateTo);
      dTo.setHours(23, 59, 59, 999);
      params.push(dTo);
      whereClauses.push(`po."date" <= $${params.length}`);
    }

    if (stockStatus === 'IN_STOCK') {
      whereClauses.push(`(COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)) > 0`);
    } else if (stockStatus === 'OUT_OF_STOCK') {
      whereClauses.push(`(COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)) <= 0`);
    } else if (stockStatus === 'LOW_STOCK') {
      whereClauses.push(`(COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)) > 0 AND (COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) - COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)) <= 10`);
    } else if (stockStatus === 'PENDING_INWARD') {
      whereClauses.push(`COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0) < poi.qty`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count 
       FROM "PurchaseOrderItem" poi 
       LEFT JOIN "PurchaseOrder" po ON poi."purchaseOrderId" = po.id
       ${whereSql}`, 
      params
    );
    const totalCount = countRes.rows[0]?.count || 0;

    params.push(limitNum + 1);
    const querySql = `
      SELECT 
        poi.id,
        poi."purchaseOrderId",
        poi."kpclCode",
        poi."itemName",
        poi.specifications,
        poi."partNumber",
        poi.make,
        poi."hsnCode",
        poi.unit,
        poi.qty as "orderedQty",
        COALESCE(po."poNumber", (SELECT po2."poNumber" FROM "PurchaseOrder" po2 WHERE po2.id = poi."purchaseOrderId"), '-') as "poNumber",
        COALESCE(po."date", (SELECT po2."date" FROM "PurchaseOrder" po2 WHERE po2.id = poi."purchaseOrderId"), NULL) as "poDate",
        COALESCE((SELECT SUM(pur.qty) FROM "Purchase" pur WHERE pur."purchaseOrderItemId" = poi.id), 0)::float as "totalPurchased",
        COALESCE((SELECT SUM(s.qty) FROM "Sale" s WHERE s."purchaseOrderItemId" = poi.id), 0)::float as "totalSold"
      FROM "PurchaseOrderItem" poi
      LEFT JOIN "PurchaseOrder" po ON poi."purchaseOrderId" = po.id
      ${whereSql}
      ORDER BY poi."createdAt" DESC
      LIMIT $${params.length}
    `;

    const { rows } = await pool.query(querySql, params);
    let nextCursor = null;
    if (rows.length > limitNum) {
      nextCursor = rows.pop().id;
    }

    // Bounded batch PO lookup for exact page items (Zero memory overhead at 10M scale)
    const poIds = [...new Set(rows.map(r => r.purchaseOrderId || r.purchaseorderid).filter(Boolean))];
    let poDict = {};
    if (poIds.length > 0) {
      const poRes = await pool.query(
        `SELECT id, "poNumber" FROM "PurchaseOrder" WHERE id = ANY($1::text[])`,
        [poIds]
      );
      for (const p of poRes.rows) {
        poDict[p.id] = p.poNumber || p.ponumber;
      }
    }

    const summary = rows.map(item => {
      const ordered = parseFloat(item.orderedQty ?? item.orderedqty ?? item.qty ?? 0);
      const purchased = parseFloat(item.totalPurchased ?? item.totalpurchased ?? 0);
      const sold = parseFloat(item.totalSold ?? item.totalsold ?? 0);
      const poId = item.purchaseOrderId || item.purchaseorderid;
      const dictPo = poDict[poId];
      const rawPo = item.poNumber || item.ponumber || item.po_number;
      const poNum = (rawPo && rawPo !== '-') ? rawPo : (dictPo || '-');

      return {
        id: item.id,
        purchaseOrderId: poId,
        poNumber: poNum,
        poDate: item.poDate || item.podate || null,
        kpclCode: item.kpclCode || item.kpclcode || '',
        itemName: item.itemName || item.itemname || '',
        specifications: item.specifications || '',
        partNumber: item.partNumber || item.partnumber || '',
        make: item.make || '',
        hsnCode: item.hsnCode || item.hsncode || '',
        unit: item.unit || 'NOS',
        orderedQty: ordered,
        totalPurchased: purchased,
        totalSold: sold,
        balanceStock: purchased - sold,
        remainingToReceive: Math.max(0, ordered - purchased)
      };
    });

    res.json({ items: summary, nextCursor, totalCount });
  } catch (err) {
    console.error('Error fetching stock summary:', err);
    res.status(500).json({ error: 'Failed to fetch stock summary' });
  }
});

// --- EDIT / DELETE APPROVAL WORKFLOWS ---
app.post('/api/approvals/request', authenticateToken, async (req, res) => {
  try {
    const { type, payload, reason } = req.body;
    if (!type || !reason) {
      return res.status(400).json({ error: 'Type and reason are required for approval request' });
    }

    const { rows } = await pool.query(
      `INSERT INTO "ApprovalRequest" ("id", "type", "status", "requestedById", "payload", "reason", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'PENDING', $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [type, req.user.id, JSON.stringify(payload || {}), reason]
    );

    res.status(201).json({ message: 'Request submitted for Owner/Manager approval', approval: rows[0] });
  } catch (err) {
    console.error('Error creating approval request:', err);
    res.status(500).json({ error: 'Failed to create approval request' });
  }
});

app.get('/api/approvals', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        a.*,
        json_build_object('username', u.username, 'fullName', u."fullName", 'role', u.role) as "requestedBy"
      FROM "ApprovalRequest" a
      LEFT JOIN "User" u ON a."requestedById" = u.id
      WHERE a.status = 'PENDING'
      ORDER BY a."createdAt" DESC
    `);

    res.json({ approvals: rows });
  } catch (err) {
    console.error('Error fetching pending approvals:', err);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// --- HOLIDAY CALENDAR APIS (COMPANY / GOVT PAID HOLIDAYS) ---
app.get('/api/holidays', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query;
    let query = `
      SELECT h.*, u."fullName" as "addedByName"
      FROM "Holiday" h
      LEFT JOIN "User" u ON h."addedById" = u.id
    `;
    const params = [];

    if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const totalDays = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, '0')}-${String(totalDays).padStart(2, '0')} 23:59:59.999`;
      query += ` WHERE h."date" >= $1::timestamp AND h."date" <= $2::timestamp`;
      params.push(startDate, endDate);
    } else if (year) {
      const y = parseInt(year, 10);
      query += ` WHERE EXTRACT(YEAR FROM h."date") = $1`;
      params.push(y);
    }

    query += ` ORDER BY h."date" ASC`;
    const { rows } = await pool.query(query, params);
    res.json({ holidays: rows });
  } catch (err) {
    console.error('Error fetching holidays:', err);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

app.post('/api/holidays', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { date, name, type = 'GOVT_HOLIDAY', description } = req.body;
    if (!date || !name || !name.trim()) {
      return res.status(400).json({ error: 'Holiday date and name are required' });
    }

    // Ensure date is treated as YYYY-MM-DD at 12:00:00 to prevent timezone rollback
    const dateOnlyStr = date.includes('T') ? date.split('T')[0] : date;
    const holidayTimestamp = `${dateOnlyStr} 12:00:00`;

    const { rows } = await pool.query(
      `INSERT INTO "Holiday" ("id", "date", "name", "type", "description", "addedById", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1::timestamp, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT ("date")
       DO UPDATE SET "name" = EXCLUDED."name", "type" = EXCLUDED."type", "description" = EXCLUDED."description", "updatedAt" = NOW()
       RETURNING *`,
      [holidayTimestamp, name.trim(), type, description || null, req.user.id]
    );

    res.status(201).json({ message: 'Holiday declared successfully!', holiday: rows[0] });
  } catch (err) {
    console.error('Error creating holiday:', err);
    res.status(500).json({ error: 'Failed to save holiday' });
  }
});

app.delete('/api/holidays/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM "Holiday" WHERE "id" = $1`, [id]);
    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) {
    console.error('Error deleting holiday:', err);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

app.patch('/api/approvals/:id/action', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const checkRes = await pool.query(`SELECT * FROM "ApprovalRequest" WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0 || checkRes.rows[0].status !== 'PENDING') {
      return res.status(404).json({ error: 'Pending approval request not found' });
    }
    const approval = checkRes.rows[0];

    if (approval.type === 'SALE_ENTRY') {
      // Sales must be approved by OWNER ONLY
      if (req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'Sale approvals must be reviewed and approved by the OWNER only.' });
      }

      const payload = typeof approval.payload === 'string' ? JSON.parse(approval.payload) : approval.payload;
      const saleId = payload.saleId;

      if (status === 'APPROVED') {
        await pool.query(
          `UPDATE "Sale" 
           SET "status" = 'APPROVED', "approvedById" = $1, "approvedAt" = NOW() 
           WHERE id = $2`,
          [req.user.id, saleId]
        );
      } else if (status === 'REJECTED') {
        await pool.query(
          `UPDATE "Sale" 
           SET "status" = 'REJECTED', "rejectionReason" = $1, "approvedById" = $2, "approvedAt" = NOW() 
           WHERE id = $3`,
          [rejectionReason || 'Rejected by Owner', req.user.id, saleId]
        );
      }
    } else if (status === 'APPROVED' && approval.type === 'EDIT_ATTENDANCE') {
      const payload = typeof approval.payload === 'string' ? JSON.parse(approval.payload) : approval.payload;
      const { date, attendanceData } = payload;
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);

      if (attendanceData && attendanceData.length > 0) {
        const workerIds = attendanceData.map(r => r.workerId);
        const dates = attendanceData.map(r => queryDate);
        const statuses = attendanceData.map(r => r.status);
        const otHours = attendanceData.map(r => parseFloat(r.overtimeHours) || 0.0);
        const dailyWageOverrides = attendanceData.map(r => r.dailyWageOverride ? parseFloat(r.dailyWageOverride) : null);
        const notes = attendanceData.map(r => r.notes || null);
        const userIds = attendanceData.map(r => approval.requestedById);

        await pool.query(
          `INSERT INTO "Attendance" ("id", "workerId", "date", "status", "overtimeHours", "otHours", "dailyWageOverride", "notes", "recordedById", "markedById", "createdAt", "updatedAt")
           SELECT gen_random_uuid()::text, u.workerId, u.dt, u.st::"AttendanceStatus", u.ot, u.ot, u.dw, u.nt, u.uid, u.uid, NOW(), NOW()
           FROM UNNEST($1::text[], $2::timestamp[], $3::text[], $4::numeric[], $5::numeric[], $6::text[], $7::text[]) 
           AS u(workerId, dt, st, ot, dw, nt, uid)
           ON CONFLICT ("workerId", "date")
           DO UPDATE SET 
             "status" = EXCLUDED."status", 
             "overtimeHours" = EXCLUDED."overtimeHours",
             "otHours" = EXCLUDED."otHours", 
             "dailyWageOverride" = EXCLUDED."dailyWageOverride", 
             "notes" = EXCLUDED."notes",
             "recordedById" = EXCLUDED."recordedById",
             "markedById" = EXCLUDED."markedById", 
             "updatedAt" = NOW()`,
          [workerIds, dates, statuses, otHours, dailyWageOverrides, notes, userIds]
        );
      }
    }

    const updateRes = await pool.query(
      `UPDATE "ApprovalRequest"
       SET "status" = $1, "approvedById" = $2, "rejectionReason" = $3, "updatedAt" = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, status === 'REJECTED' ? rejectionReason : null, id]
    );

    res.json({ message: `Approval request ${status.toLowerCase()}`, approval: updateRes.rows[0] });
  } catch (err) {
    console.error('Error processing approval decision:', err);
    res.status(500).json({ error: 'Failed to process approval decision' });
  }
});

// --- MASTER USER MANAGEMENT (WITH MANDATORY MOBILE & SMART DELETE) ---
app.get('/api/users', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { rows: users } = await pool.query(
      `SELECT "id", "username", "fullName", "mobileNumber", "role", "createdAt" FROM "User" ORDER BY "createdAt" DESC`
    );

    const userList = users.map((u) => ({
      ...u,
      hasCreatedEntries: false,
    }));

    res.json({ users: userList });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const { username, fullName, mobileNumber, password, role } = req.body;

    // MANDATORY MOBILE NUMBER CHECK
    if (!username || !fullName || !mobileNumber || !password || !role) {
      return res.status(400).json({ error: 'All fields (Username, Full Name, Mobile Number, Password, Role) are mandatory!' });
    }

    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      return res.status(400).json({ error: 'Mobile number must be a valid 10-digit phone number' });
    }

    if (!['SUPERVISOR', 'MANAGER'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either MANAGER or SUPERVISOR' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: `Username '${username}' is already taken` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: username.trim(),
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        password: hashedPassword,
        role,
      },
      select: { id: true, username: true, fullName: true, mobileNumber: true, role: true, createdAt: true },
    });

    res.status(201).json({ user: newUser });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, fullName, mobileNumber, password, role } = req.body;

    if (req.user.role !== 'OWNER' && req.user.id !== id) {
      return res.status(403).json({ error: 'Only Owner can edit other user accounts' });
    }

    const data = {};
    if (username && username.trim()) {
      const trimmedUser = username.trim();
      const existing = await prisma.user.findFirst({
        where: { username: trimmedUser, NOT: { id } }
      });
      if (existing) {
        return res.status(400).json({ error: `Username '${trimmedUser}' is already taken` });
      }
      data.username = trimmedUser;
    }
    if (fullName) data.fullName = fullName.trim();
    if (mobileNumber) {
      if (!/^\d{10}$/.test(mobileNumber.trim())) {
        return res.status(400).json({ error: 'Mobile number must be a valid 10-digit phone number' });
      }
      data.mobileNumber = mobileNumber.trim();
    }
    if (role) {
      if (req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only Owner can change roles' });
      }
      if (!['SUPERVISOR', 'MANAGER', 'OWNER'].includes(role)) {
        return res.status(400).json({ error: 'Role must be OWNER, MANAGER, or SUPERVISOR' });
      }
      data.role = role;
    }
    if (password && password.trim() !== '') {
      data.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, fullName: true, mobileNumber: true, role: true }
    });

    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user account details' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has created entries
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'OWNER') {
      return res.status(400).json({ error: 'Owner user cannot be deleted' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: `User '${user.username}' deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- WORKER DIVISIONS API ---
app.get('/api/divisions', authenticateToken, async (req, res) => {
  try {
    const { rows: divisions } = await pool.query(`
      SELECT d."id", d."name", d."createdAt", d."updatedAt",
             COUNT(w."id")::int as "workerCount",
             json_build_object('workers', COUNT(w."id")::int) as "_count"
      FROM "Division" d
      LEFT JOIN "Worker" w ON d."id" = w."divisionId"
      GROUP BY d."id", d."name", d."createdAt", d."updatedAt"
      ORDER BY d."name" ASC
    `);
    res.json({ divisions });
  } catch (err) {
    console.error('Fetch divisions error:', err);
    res.status(500).json({ error: 'Failed to fetch divisions' });
  }
});

app.post('/api/divisions', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Division name is required' });
    }
    const existing = await prisma.division.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ error: 'Division name already exists' });
    }
    const division = await prisma.division.create({
      data: { name: name.trim() }
    });
    res.status(201).json({ division });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create division' });
  }
});

app.put('/api/divisions/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Division name is required' });
    }
    const existing = await prisma.division.findFirst({
      where: { name: name.trim(), NOT: { id } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Division name already exists' });
    }
    const division = await prisma.division.update({
      where: { id },
      data: { name: name.trim() },
      include: { _count: { select: { workers: true } } }
    });
    res.json({ division, message: 'Division updated successfully' });
  } catch (err) {
    console.error('Update division error:', err);
    res.status(500).json({ error: 'Failed to update division' });
  }
});

app.delete('/api/divisions/:id', authenticateToken, requireRoles(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    // Check if any workers are assigned to this division
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int as count FROM "Worker" WHERE "divisionId" = $1`, [id]);
    const workerCount = countRows[0]?.count || 0;
    if (workerCount > 0) {
      return res.status(400).json({ error: `Cannot delete division — ${workerCount} worker(s) are still assigned. Please reassign them to another division first.` });
    }
    await pool.query(`DELETE FROM "Division" WHERE "id" = $1`, [id]);
    res.json({ message: 'Division deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete division' });
  }
});

// --- WORKERS REGISTRY API (DIRECT POSTGRESQL LAYER) ---
app.get('/api/workers', authenticateToken, async (req, res) => {
  try {
    const { divisionId, limit = 50, cursor } = req.query;
    const limitNum = parseInt(limit, 10) || 50;

    let query = `
      SELECT w."id", w."workerId", w."fullName", w."fatherName", w."designation", w."mobileNumber",
             w."dailyWage", COALESCE(w."dailyAllowance", 0) as "dailyAllowance",
             COALESCE(w."advanceTaken", w."advanceBalance", 0) as "advanceTaken",
             COALESCE(NULLIF(w."advanceBalance", 0), w."advanceTaken", 0) as "advanceBalance",
             COALESCE(w."otAllowance", 0) as "otAllowance",
             w."otHourlyRate", w."divisionId",
             COALESCE(w."pfNumber", '') as "pfNumber",
             COALESCE(w."esiNumber", '') as "esiNumber",
             COALESCE(w."uanNumber", '') as "uanNumber",
             COALESCE(w."bankAccountNo", '') as "bankAccountNo",
             COALESCE(w."ifscCode", '') as "ifscCode",
             COALESCE(w."placeOfWork", '') as "placeOfWork",
             COALESCE(w."natureOfWork", '') as "natureOfWork",
             w."createdAt", w."updatedAt",
             json_build_object('id', d."id", 'name', d."name") as "division"
      FROM "Worker" w
      JOIN "Division" d ON w."divisionId" = d."id"
    `;
    const params = [];
    let whereClauses = [];

    if (divisionId) {
      params.push(divisionId);
      whereClauses.push(`w."divisionId" = $${params.length}`);
    }

    if (cursor) {
      params.push(cursor);
      whereClauses.push(`w."id" > $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY 
      CASE 
        WHEN w."workerId" ~ '^SKC-E-[0-9]+$' THEN CAST(SUBSTRING(w."workerId" FROM 7) AS INTEGER)
        WHEN w."workerId" ~ '^[0-9]+$' THEN CAST(w."workerId" AS INTEGER)
        ELSE 999999
      END ASC, w."workerId" ASC, w."fullName" ASC`;
    
    params.push(limitNum + 1);
    query += ` LIMIT $${params.length}`;

    const { rows } = await pool.query(query, params);
    let nextCursor = null;
    if (rows.length > limitNum) {
      const nextWorker = rows.pop();
      nextCursor = nextWorker.id;
    }

    res.json({ workers: rows, nextCursor });
  } catch (err) {
    console.error('Fetch workers error:', err);
    res.status(500).json({ error: 'Failed to fetch workers list' });
  }
});

app.post('/api/workers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'SUPERVISOR') {
      return res.status(403).json({ error: 'Worker registration is restricted to Owners or Managers only!' });
    }

    const { workerId, fullName, fatherName, designation, mobileNumber, dailyWage, dailyAllowance, advanceTaken, advanceBalance, otAllowance, otHourlyRate, divisionId, pfNumber, esiNumber, uanNumber, bankAccountNo, ifscCode, placeOfWork, natureOfWork } = req.body;
    if (!workerId || !fullName || !mobileNumber || !dailyWage || !divisionId) {
      return res.status(400).json({ error: 'Worker ID, Full Name, Mobile Number, Daily Wage, and Division are mandatory!' });
    }

    // Format phone number to strict Indian format
    let cleanedPhone = mobileNumber.trim().replace(/[^0-9+]/g, '');
    if (cleanedPhone.length === 10) {
      cleanedPhone = '+91' + cleanedPhone;
    } else if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
      cleanedPhone = '+' + cleanedPhone;
    }

    if (!/^\+91\d{10}$/.test(cleanedPhone)) {
      return res.status(400).json({ error: 'Mobile number must be a valid 10-digit Indian phone number (+91)' });
    }

    const { rows: existingRows } = await pool.query(
      `SELECT "id" FROM "Worker" WHERE "workerId" = $1`,
      [workerId.trim()]
    );
    if (existingRows.length > 0) {
      return res.status(400).json({ error: `Worker ID '${workerId}' is already registered` });
    }

    const numDailyWage = parseFloat(dailyWage) || 0;
    const numAllowance = dailyAllowance !== undefined && dailyAllowance !== '' ? parseFloat(dailyAllowance) : 0;
    const numAdvTaken = advanceTaken !== undefined && advanceTaken !== '' ? parseFloat(advanceTaken) : (advanceBalance !== undefined && advanceBalance !== '' ? parseFloat(advanceBalance) : 0);
    const numAdvBal = advanceBalance !== undefined && advanceBalance !== '' ? parseFloat(advanceBalance) : numAdvTaken;
    const numOtAllowance = otAllowance !== undefined && otAllowance !== '' ? parseFloat(otAllowance) : 0;
    const numOtRate = otHourlyRate ? parseFloat(otHourlyRate) : numDailyWage / 8;

    const { rows } = await pool.query(
      `INSERT INTO "Worker" ("id", "workerId", "fullName", "fatherName", "designation", "mobileNumber", "dailyWage", "dailyAllowance", "advanceTaken", "advanceBalance", "otAllowance", "otHourlyRate", "divisionId", "pfNumber", "esiNumber", "uanNumber", "bankAccountNo", "ifscCode", "placeOfWork", "natureOfWork", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
       RETURNING *`,
      [
        workerId.trim(),
        fullName.trim(),
        fatherName ? fatherName.trim() : null,
        designation ? designation.trim() : null,
        cleanedPhone,
        numDailyWage,
        numAllowance,
        numAdvTaken,
        numAdvBal,
        numOtAllowance,
        numOtRate,
        divisionId,
        pfNumber ? pfNumber.trim() : null,
        esiNumber ? esiNumber.trim() : null,
        uanNumber ? uanNumber.trim() : null,
        bankAccountNo ? bankAccountNo.trim() : null,
        ifscCode ? ifscCode.trim() : null,
        placeOfWork ? placeOfWork.trim() : null,
        natureOfWork ? natureOfWork.trim() : null
      ]
    );

    const { rows: divRows } = await pool.query(`SELECT "id", "name" FROM "Division" WHERE "id" = $1`, [divisionId]);
    const worker = { ...rows[0], division: divRows[0] || null };

    res.status(201).json({ worker });
  } catch (err) {
    console.error('Create worker error:', err);
    res.status(500).json({ error: 'Failed to register worker' });
  }
});

app.put('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, fatherName, designation, mobileNumber, dailyWage, dailyAllowance, advanceTaken, advanceBalance, otAllowance, otHourlyRate, divisionId, pfNumber, esiNumber, uanNumber, bankAccountNo, ifscCode, placeOfWork, natureOfWork } = req.body;

    const { rows: existing } = await pool.query(`SELECT * FROM "Worker" WHERE "id" = $1`, [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Worker not found' });

    // SUPERVISOR: ONLY ALLOW DIVISION CHANGE
    if (req.user.role === 'SUPERVISOR') {
      if (!divisionId) {
        return res.status(400).json({ error: 'Division is required for supervisor update' });
      }
      const { rows } = await pool.query(
        `UPDATE "Worker"
         SET "divisionId" = $1, "updatedAt" = NOW()
         WHERE "id" = $2
         RETURNING *`,
        [divisionId, id]
      );
      const { rows: divRows } = await pool.query(`SELECT "id", "name" FROM "Division" WHERE "id" = $1`, [divisionId]);
      const worker = { ...rows[0], division: divRows[0] || null };
      return res.json({ worker });
    }

    if (dailyWage !== undefined || dailyAllowance !== undefined || advanceTaken !== undefined || advanceBalance !== undefined || otAllowance !== undefined || otHourlyRate !== undefined) {
      if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
        return res.status(403).json({ error: 'Wage rates and advance modifications are restricted to Owners or Managers only!' });
      }
    }

    let cleanedPhone = existing[0].mobileNumber;
    if (mobileNumber) {
      let phone = mobileNumber.trim().replace(/[^0-9+]/g, '');
      if (phone.length === 10) phone = '+91' + phone;
      if (!/^\+91\d{10}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid 10-digit Indian phone number format' });
      }
      cleanedPhone = phone;
    }

    const newFullName = fullName !== undefined ? fullName.trim() : existing[0].fullName;
    const newFatherName = fatherName !== undefined ? (fatherName ? fatherName.trim() : null) : existing[0].fatherName;
    const newDesignation = designation !== undefined ? (designation ? designation.trim() : null) : existing[0].designation;
    const newDivisionId = divisionId || existing[0].divisionId;
    const newDailyWage = dailyWage !== undefined ? parseFloat(dailyWage) : existing[0].dailyWage;
    const newAllowance = dailyAllowance !== undefined ? (parseFloat(dailyAllowance) || 0) : (existing[0].dailyAllowance || 0);
    const newAdvanceTaken = advanceTaken !== undefined ? (parseFloat(advanceTaken) || 0) : (existing[0].advanceTaken || 0);
    const newAdvance = advanceBalance !== undefined ? (parseFloat(advanceBalance) || 0) : (existing[0].advanceBalance || 0);
    const newOtAllowance = otAllowance !== undefined ? (parseFloat(otAllowance) || 0) : (existing[0].otAllowance || 0);
    const newOtRate = otHourlyRate !== undefined ? parseFloat(otHourlyRate) : existing[0].otHourlyRate;
    const newPfNumber = pfNumber !== undefined ? (pfNumber ? pfNumber.trim() : null) : existing[0].pfNumber;
    const newEsiNumber = esiNumber !== undefined ? (esiNumber ? esiNumber.trim() : null) : existing[0].esiNumber;
    const newUanNumber = uanNumber !== undefined ? (uanNumber ? uanNumber.trim() : null) : existing[0].uanNumber;
    const newBankAcc = bankAccountNo !== undefined ? (bankAccountNo ? bankAccountNo.trim() : null) : existing[0].bankAccountNo;
    const newIfsc = ifscCode !== undefined ? (ifscCode ? ifscCode.trim() : null) : existing[0].ifscCode;
    const newPlace = placeOfWork !== undefined ? (placeOfWork ? placeOfWork.trim() : null) : existing[0].placeOfWork;
    const newNature = natureOfWork !== undefined ? (natureOfWork ? natureOfWork.trim() : null) : existing[0].natureOfWork;

    const { rows } = await pool.query(
      `UPDATE "Worker"
       SET "fullName" = $1, "fatherName" = $2, "designation" = $3, "mobileNumber" = $4,
           "dailyWage" = $5, "dailyAllowance" = $6, "advanceTaken" = $7, "advanceBalance" = $8, "otAllowance" = $9, "otHourlyRate" = $10, "divisionId" = $11,
           "pfNumber" = $12, "esiNumber" = $13, "uanNumber" = $14, "bankAccountNo" = $15, "ifscCode" = $16, "placeOfWork" = $17, "natureOfWork" = $18,
           "updatedAt" = NOW()
       WHERE "id" = $19
       RETURNING *`,
      [newFullName, newFatherName, newDesignation, cleanedPhone, newDailyWage, newAllowance, newAdvanceTaken, newAdvance, newOtAllowance, newOtRate, newDivisionId, newPfNumber, newEsiNumber, newUanNumber, newBankAcc, newIfsc, newPlace, newNature, id]
    );

    const { rows: divRows } = await pool.query(`SELECT "id", "name" FROM "Division" WHERE "id" = $1`, [newDivisionId]);
    const worker = { ...rows[0], division: divRows[0] || null };

    res.json({ worker });
  } catch (err) {
    console.error('Update worker error:', err);
    res.status(500).json({ error: 'Failed to update worker registry' });
  }
});

app.delete('/api/workers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'SUPERVISOR') {
      return res.status(403).json({ error: 'Worker deletion is restricted to Owners or Managers only!' });
    }
    if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Only Owner or Manager can delete worker records' });
    }

    // Cleanly cascade delete any dummy attendance or payments associated with this worker
    await pool.query(`DELETE FROM "Attendance" WHERE "workerId" = $1`, [id]);
    await pool.query(`DELETE FROM "MonthlyPayment" WHERE "workerId" = $1`, [id]);
    await pool.query(`DELETE FROM "Worker" WHERE "id" = $1`, [id]);

    res.json({ message: 'Worker and all associated records deleted successfully' });
  } catch (err) {
    console.error('Delete worker error:', err);
    res.status(500).json({ error: 'Failed to delete worker' });
  }
});

// --- DAILY WORKER ATTENDANCE API (DIRECT SQL) ---
// --- DAILY WORKER ATTENDANCE API (DIRECT SQL) ---
app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { date, divisionId } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date (YYYY-MM-DD) is required' });
    }

    let query = `
      SELECT a."id", a."workerId", a."date", a."status", a."divisionId", a."secondDivisionId",
             COALESCE(a."overtimeHours", 0)::float as "overtimeHours", 
             a."dailyWageOverride", a."notes",
             d."name" as "divisionName",
             d2."name" as "secondDivisionName",
             json_build_object('id', w."id", 'workerId', w."workerId", 'fullName', w."fullName", 'dailyWage', w."dailyWage", 'divisionId', w."divisionId") as "worker"
      FROM "Attendance" a
      JOIN "Worker" w ON a."workerId" = w."id"
      LEFT JOIN "Division" d ON a."divisionId" = d."id"
      LEFT JOIN "Division" d2 ON a."secondDivisionId" = d2."id"
      WHERE a."date"::date = $1::date
    `;
    const params = [date];

    if (divisionId && divisionId !== 'ALL' && divisionId !== 'all') {
      params.push(divisionId);
      query += ` AND (a."divisionId" = $${params.length} OR a."secondDivisionId" = $${params.length} OR (a."divisionId" IS NULL AND w."divisionId" = $${params.length}))`;
    }

    const { rows: attendances } = await pool.query(query, params);

    res.json({ attendances });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ error: 'Failed to load attendance records' });
  }
});

app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { date, attendanceData } = req.body; // attendanceData: [{ workerId, status, overtimeHours }]
    if (!date || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({ error: 'Date and valid attendance data are required' });
    }

    const queryDateStr = `${date} 00:00:00`;
    const workerIds = attendanceData.map(r => r.workerId);

    // Check if attendance has already been logged for these workers on this date (Direct SQL)
    const { rows: existingLogs } = await pool.query(
      `SELECT * FROM "Attendance" WHERE "date"::date = $1::date AND "workerId" = ANY($2::text[])`,
      [date, workerIds]
    );

    if (existingLogs.length > 0) {
      // User is editing existing daily attendance
      if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
        const { rows: workers } = await pool.query(
          `SELECT "id", "fullName", "dailyWage" FROM "Worker" WHERE "id" = ANY($1::text[])`,
          [workerIds]
        );

        const diffs = [];
        attendanceData.forEach((record) => {
          const existing = existingLogs.find(el => el.workerId === record.workerId);
          const worker = workers.find(w => w.id === record.workerId);
          if (existing && worker) {
            const statusChanged = existing.status !== record.status;
            const existingOt = parseFloat(existing.otHours) || 0.0;
            const incomingOt = parseFloat(record.overtimeHours) || 0.0;
            const otChanged = Math.abs(existingOt - incomingOt) > 0.01;
            
            const incomingOverride = record.dailyWageOverride ? parseFloat(record.dailyWageOverride) : null;
            const existingOverride = existing.dailyWageOverride ? parseFloat(existing.dailyWageOverride) : null;
            const wageChanged = existingOverride !== incomingOverride;

            if (statusChanged || otChanged || wageChanged) {
              const statusDesc = statusChanged ? `${existing.status} ➔ ${record.status}` : null;
              const otDesc = otChanged ? `OT: ${existingOt}h ➔ ${incomingOt}h` : null;
              const wageDesc = wageChanged ? `Wage: ₹${existingOverride || worker.dailyWage} ➔ ₹${incomingOverride || worker.dailyWage}` : null;
              const parts = [statusDesc, otDesc, wageDesc].filter(Boolean);
              diffs.push(`${worker.fullName} (${parts.join(', ')})`);
            }
          }
        });

        const detailedReason = `Supervisor '${req.user.fullName}' requested to modify attendance for ${date}. Changes: ${diffs.join('; ') || 'No changes.'}`;

        // Supervisors must go through Owner/Manager approval for edits
        const { rows: appRows } = await pool.query(
          `INSERT INTO "ApprovalRequest" ("id", "type", "status", "payload", "reason", "requestedById", "createdAt", "updatedAt")
           VALUES (gen_random_uuid()::text, 'EDIT_ATTENDANCE', 'PENDING', $1, $2, $3, NOW(), NOW())
           RETURNING *`,
          [JSON.stringify({ date, attendanceData }), detailedReason, req.user.id]
        );
        const approval = appRows[0];
        return res.status(202).json({
          message: '⚠️ Changes detected! Editing previously logged attendance requires approval. Modification request has been submitted to Owner/Manager.',
          requiresApproval: true,
          approval
        });
      }
    }

    if (attendanceData && attendanceData.length > 0) {
      const workerIds = attendanceData.map(r => r.workerId);
      const dates = attendanceData.map(r => date);
      const statuses = attendanceData.map(r => r.status);
      const otHours = attendanceData.map(r => parseFloat(r.overtimeHours) || 0.0);
      const dailyWageOverrides = attendanceData.map(r => r.dailyWageOverride ? parseFloat(r.dailyWageOverride) : null);
      const divisionIds = attendanceData.map(r => r.divisionId || null);
      const notes = attendanceData.map(r => r.notes || null);
      const userIds = attendanceData.map(r => req.user.id);

      await pool.query(
        `INSERT INTO "Attendance" ("id", "workerId", "date", "status", "overtimeHours", "otHours", "dailyWageOverride", "divisionId", "secondDivisionId", "notes", "recordedById", "markedById", "createdAt", "updatedAt")
         SELECT gen_random_uuid()::text, u.workerId, u.dt, u.st::"AttendanceStatus", u.ot, u.ot, u.dw, u.divId, NULL, u.nt, u.uid, u.uid, NOW(), NOW()
         FROM UNNEST($1::text[], $2::timestamp[], $3::text[], $4::numeric[], $5::numeric[], $6::text[], $7::text[], $8::text[]) 
         AS u(workerId, dt, st, ot, dw, divId, nt, uid)
         ON CONFLICT ("workerId", "date")
         DO UPDATE SET
           "status" = EXCLUDED."status",
           "overtimeHours" = EXCLUDED."overtimeHours",
           "otHours" = EXCLUDED."otHours",
           "dailyWageOverride" = EXCLUDED."dailyWageOverride",
           "divisionId" = CASE 
             WHEN "Attendance"."status" = 'HALF_DAY' AND EXCLUDED."status" = 'HALF_DAY' AND "Attendance"."divisionId" IS NOT NULL AND "Attendance"."divisionId" <> EXCLUDED."divisionId"
             THEN "Attendance"."divisionId"
             ELSE COALESCE(EXCLUDED."divisionId", "Attendance"."divisionId")
           END,
           "secondDivisionId" = CASE 
             WHEN "Attendance"."status" = 'HALF_DAY' AND EXCLUDED."status" = 'HALF_DAY' AND "Attendance"."divisionId" IS NOT NULL AND "Attendance"."divisionId" <> EXCLUDED."divisionId"
             THEN EXCLUDED."divisionId"
             ELSE "Attendance"."secondDivisionId"
           END,
           "notes" = EXCLUDED."notes",
           "recordedById" = EXCLUDED."recordedById",
           "markedById" = EXCLUDED."markedById",
           "updatedAt" = NOW()`,
        [workerIds, dates, statuses, otHours, dailyWageOverrides, divisionIds, notes, userIds]
      );
    }

    res.json({ message: 'Attendance records saved successfully!' });
  } catch (err) {
    console.error('Attendance submit error:', err);
    res.status(500).json({ error: 'Failed to record daily attendance' });
  }
});

// --- ATTENDANCE CORRECTION REQUESTS (SUPERVISOR EDIT -> MANAGER/ADMIN APPROVAL) ---
app.get('/api/attendance/correction-requests', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, 
              w."fullName" as "workerName", w."workerId" as "workerCode", w."dailyWage",
              d."name" as "newDivisionName",
              u."fullName" as "requestedByName",
              a."fullName" as "approvedByName"
       FROM "AttendanceCorrectionRequest" r
       JOIN "Worker" w ON r."workerId" = w."id"
       JOIN "Division" d ON r."newDivisionId" = d."id"
       JOIN "User" u ON r."requestedById" = u."id"
       LEFT JOIN "User" a ON r."approvedById" = a."id"
       ORDER BY r."createdAt" DESC`
    );
    res.json({ requests: rows });
  } catch (err) {
    console.error('Fetch correction requests error:', err);
    res.status(500).json({ error: 'Failed to load attendance correction requests' });
  }
});

app.post('/api/attendance/correction-requests', authenticateToken, async (req, res) => {
  try {
    const { workerId, date, oldStatus, oldDivisionName, newStatus, newDivisionId, newOvertimeHours, reason } = req.body;
    if (!workerId || !date || !newStatus || !newDivisionId || !reason) {
      return res.status(400).json({ error: 'Worker, date, new status, division, and reason are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO "AttendanceCorrectionRequest" 
       ("id", "workerId", "date", "oldStatus", "oldDivisionName", "newStatus", "newDivisionId", "newOvertimeHours", "reason", "status", "requestedById", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2::timestamp, $3, $4, $5::"AttendanceStatus", $6, $7, $8, 'PENDING', $9, NOW(), NOW())
       RETURNING *`,
      [workerId, date, oldStatus || null, oldDivisionName || null, newStatus, newDivisionId, parseFloat(newOvertimeHours) || 0, reason, req.user.id]
    );

    res.json({ message: 'Attendance correction request submitted to Manager/Admin for approval!', request: rows[0] });
  } catch (err) {
    console.error('Submit correction request error:', err);
    res.status(500).json({ error: 'Failed to submit attendance correction request' });
  }
});

app.put('/api/attendance/correction-requests/:id/review', authenticateToken, requireRoles(['MANAGER', 'OWNER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // 'APPROVED' or 'REJECTED'

    if (!action || (action !== 'APPROVED' && action !== 'REJECTED')) {
      return res.status(400).json({ error: 'Action must be APPROVED or REJECTED' });
    }

    const { rows: reqRows } = await pool.query(
      `SELECT * FROM "AttendanceCorrectionRequest" WHERE "id" = $1`,
      [id]
    );
    if (reqRows.length === 0) return res.status(404).json({ error: 'Correction request not found' });
    const corrReq = reqRows[0];

    if (action === 'APPROVED') {
      // 1. Update Attendance table directly with corrected values!
      await pool.query(
        `INSERT INTO "Attendance" ("id", "workerId", "date", "status", "overtimeHours", "otHours", "divisionId", "secondDivisionId", "notes", "recordedById", "markedById", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3::"AttendanceStatus", $4, $4, $5, NULL, $6, $7, $7, NOW(), NOW())
         ON CONFLICT ("workerId", "date")
         DO UPDATE SET
           "status" = EXCLUDED."status",
           "overtimeHours" = EXCLUDED."overtimeHours",
           "otHours" = EXCLUDED."otHours",
           "divisionId" = EXCLUDED."divisionId",
           "secondDivisionId" = NULL,
           "notes" = EXCLUDED."notes",
           "updatedAt" = NOW()`,
        [corrReq.workerId, corrReq.date, corrReq.newStatus, corrReq.newOvertimeHours, corrReq.newDivisionId, `Corrected: ${corrReq.reason}`, req.user.id]
      );
    }

    // 2. Update the correction request record status
    await pool.query(
      `UPDATE "AttendanceCorrectionRequest"
       SET "status" = $1, "approvedById" = $2, "rejectionReason" = $3, "updatedAt" = NOW()
       WHERE "id" = $4`,
      [action, req.user.id, rejectionReason || null, id]
    );

    res.json({ message: `Attendance correction request ${action.toLowerCase()} successfully!` });
  } catch (err) {
    console.error('Review correction request error:', err);
    res.status(500).json({ error: 'Failed to process attendance correction review' });
  }
});

// --- MONTHLY WAGE CALCULATION & REGISTER BOOK DRILLDOWN API (DIRECT SQL) ---
app.get('/api/wages/monthly', authenticateToken, async (req, res) => {
  try {
    const { month, year, divisionId } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and Year parameters are required' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const totalDays = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(totalDays).padStart(2, '0')} 23:59:59.999`;

    let workerQuery = `
      SELECT w."id", w."workerId", w."fullName", w."fatherName", w."designation", w."mobileNumber",
             w."dailyWage", COALESCE(w."dailyAllowance", 0) as "dailyAllowance",
             COALESCE(w."advanceTaken", w."advanceBalance", 0) as "advanceTaken",
             COALESCE(NULLIF(w."advanceBalance", 0), w."advanceTaken", 0) as "advanceBalance",
             COALESCE(w."otAllowance", 0) as "otAllowance",
             w."otHourlyRate", w."divisionId",
             COALESCE(w."pfNumber", '') as "pfNumber",
             COALESCE(w."esiNumber", '') as "esiNumber",
             COALESCE(w."uanNumber", '') as "uanNumber",
             COALESCE(w."bankAccountNo", '') as "bankAccountNo",
             COALESCE(w."ifscCode", '') as "ifscCode",
             COALESCE(w."placeOfWork", '') as "placeOfWork",
             COALESCE(w."natureOfWork", '') as "natureOfWork",
             d."name" as "divisionName"
      FROM "Worker" w
      JOIN "Division" d ON w."divisionId" = d."id"
    `;
    const workerParams = [];
    if (divisionId) {
      workerQuery += ` WHERE w."divisionId" = $1`;
      workerParams.push(divisionId);
    }
    workerQuery += ` ORDER BY w."fullName" ASC`;

    const { rows: workers } = await pool.query(workerQuery, workerParams);

    // Fetch attendances for this month
    const { rows: attendances } = await pool.query(
      `SELECT a."workerId", a."date", a."status", COALESCE(a."overtimeHours", 0)::float as "overtimeHours", a."dailyWageOverride", a."divisionId",
              d."name" as "divisionName"
       FROM "Attendance" a
       LEFT JOIN "Division" d ON a."divisionId" = d."id"
       WHERE a."date" >= $1::timestamp AND a."date" <= $2::timestamp`,
      [startDate, endDate]
    );

    // Fetch declared holidays for this month
    const { rows: holidays } = await pool.query(
      `SELECT "date", "name" FROM "Holiday" WHERE "date" >= $1::timestamp AND "date" <= $2::timestamp`,
      [startDate, endDate]
    );

    // Fetch payments for this month
    const { rows: payments } = await pool.query(
      `SELECT * FROM "MonthlyPayment" WHERE "month" = $1 AND "year" = $2`,
      [m, y]
    );

    const attsByWorker = {};
    attendances.forEach(a => {
      if (!attsByWorker[a.workerId]) attsByWorker[a.workerId] = [];
      attsByWorker[a.workerId].push(a);
    });

    const paysByWorker = {};
    payments.forEach(p => {
      paysByWorker[p.workerId] = p;
    });

    const formatToLocalDateStr = (d) => {
      const dt = new Date(d);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const holidayDatesSet = new Set(holidays.map(h => formatToLocalDateStr(h.date)));

    const wageReport = workers.map((worker) => {
      const workerAtts = attsByWorker[worker.id] || [];
      const workerAttDateMap = {};
      let present = 0;
      let absent = 0;
      let half = 0;
      let leave = 0;
      let totalOt = 0;
      const divisionCounts = {};

      workerAtts.forEach((att) => {
        const dStr = formatToLocalDateStr(att.date);
        workerAttDateMap[dStr] = att;
        const divName = att.divisionName || worker.divisionName || 'General';

        if (att.status === 'PRESENT') {
          present += 1;
          divisionCounts[divName] = (divisionCounts[divName] || 0) + 1;
        } else if (att.status === 'ABSENT') {
          absent += 1;
        } else if (att.status === 'HALF_DAY') {
          half += 1;
          divisionCounts[divName] = (divisionCounts[divName] || 0) + 0.5;
        } else if (att.status === 'LEAVE') {
          leave += 1;
        }
        totalOt += (parseFloat(att.overtimeHours) || 0.0);
      });

      // Credit paid Govt Holidays for workers
      let paidHolidaysCount = 0;
      holidayDatesSet.forEach(hDateStr => {
        const att = workerAttDateMap[hDateStr];
        // If not marked at all, or if marked as LEAVE or NOT_MARKED, give 1.0 day paid holiday
        // If marked PRESENT, they already received +1 in 'present' above, so don't double count!
        if (!att || att.status === 'LEAVE') {
          paidHolidaysCount += 1;
          const defaultDiv = worker.divisionName || 'General';
          divisionCounts[defaultDiv] = (divisionCounts[defaultDiv] || 0) + 1;
        }
      });

      const workingDays = present + (half * 0.5) + paidHolidaysCount;
      const dailyWage = parseFloat(worker.dailyWage) || 0;
      const dailyAllowance = parseFloat(worker.dailyAllowance) || 0;
      const advanceTaken = parseFloat(worker.advanceTaken) || 0;
      const advanceBalance = parseFloat(worker.advanceBalance) || 0;

      const wagesAmount = Math.round(workingDays * dailyWage);
      const allowanceAmount = Math.round(workingDays * dailyAllowance);
      const grossPayment = wagesAmount + allowanceAmount;

      const dbPayment = paysByWorker[worker.id];

      // Flexible / Manual deductions (pre-filled from DB if already entered/approved)
      const pfAmount = dbPayment ? (parseFloat(dbPayment.pfAmount) || 0) : 0;
      const esiAmount = dbPayment ? (parseFloat(dbPayment.esiAmount) || 0) : 0;
      const netBaseAmount = grossPayment - pfAmount - esiAmount;

      const otRate = parseFloat(worker.otHourlyRate) || (dailyWage / 8);
      const otPayment = dbPayment && dbPayment.otPayment !== undefined && dbPayment.otPayment !== null 
        ? parseFloat(dbPayment.otPayment) 
        : Math.round(totalOt * otRate);

      // OT Allowance should ONLY be given when OT is actually done (totalOt > 0) or manually set in payment
      const defaultOtAllowance = parseFloat(worker.otAllowance) || 0;
      const otAllowance = dbPayment && dbPayment.otAllowance !== undefined && dbPayment.otAllowance !== null 
        ? parseFloat(dbPayment.otAllowance) 
        : (totalOt > 0 ? defaultOtAllowance : 0);

      const totalPayment = netBaseAmount + otPayment + otAllowance;
      const advanceDeducted = dbPayment ? (parseFloat(dbPayment.advanceDeducted) || 0) : 0;
      // If dbPayment exists (already approved), worker.advanceBalance in database has ALREADY been updated.
      // So remaining is worker.advanceBalance, and original balance before deduction was worker.advanceBalance + advanceDeducted.
      // If NOT yet approved, remaining is worker.advanceBalance - advanceDeducted.
      const initialAdvanceBalance = dbPayment ? (advanceBalance + advanceDeducted) : advanceBalance;
      const remainingAdvanceBalance = dbPayment ? advanceBalance : Math.max(0, advanceBalance - advanceDeducted);
      const extraAmount = dbPayment ? (parseFloat(dbPayment.extraAmount) || 0) : 0;
      const finalNetAmount = totalPayment - advanceDeducted + extraAmount;

      return {
        workerId: worker.id,
        empId: worker.workerId,
        fullName: worker.fullName,
        fatherName: worker.fatherName || '-',
        designation: worker.designation || 'Worker',
        mobileNumber: worker.mobileNumber,
        divisionName: worker.divisionName,
        divisionBreakdown: divisionCounts,
        
        // Statutory & Workplace details for Salary Slip
        pfNumber: worker.pfNumber || '',
        esiNumber: worker.esiNumber || '',
        uanNumber: worker.uanNumber || '',
        bankAccountNo: worker.bankAccountNo || '',
        ifscCode: worker.ifscCode || '',
        placeOfWork: worker.placeOfWork || worker.divisionName || '',
        natureOfWork: worker.natureOfWork || 'MAINTENANCE',

        // 18 Official Register Columns + Advance Balances
        dailyWage,
        workingDays,
        dailyAllowance,
        advanceTaken,
        advanceBalance: initialAdvanceBalance,
        wagesAmount,
        allowanceAmount,
        grossPayment,
        pfAmount,
        esiAmount,
        netBaseAmount,
        totalOtHours: totalOt,
        otHourlyRate: otRate,
        otPayment,
        otAllowance,
        totalPayment,
        advanceDeducted,
        remainingAdvanceBalance,
        extraAmount,
        finalNetAmount,
        
        calculatedAmount: finalNetAmount,
        paymentStatus: dbPayment ? dbPayment.status : 'PENDING',
        paymentId: dbPayment ? dbPayment.id : null,
      };
    });

    res.json({ wages: wageReport });
  } catch (err) {
    console.error('Wages report error:', err);
    res.status(500).json({ error: 'Failed to calculate monthly wages' });
  }
});

// GET /api/attendance/worker-month - Physical Register Book style day-by-day drilldown (DIRECT SQL)
app.get('/api/attendance/worker-month', authenticateToken, async (req, res) => {
  try {
    const { workerId, month, year } = req.query;
    if (!workerId || !month || !year) {
      return res.status(400).json({ error: 'workerId, month, and year are required' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const { rows: workerRows } = await pool.query(
      `SELECT w.*, COALESCE(d."name", 'General') as "divisionName"
       FROM "Worker" w
       LEFT JOIN "Division" d ON w."divisionId" = d."id"
       WHERE w."id" = $1`,
      [workerId]
    );

    if (workerRows.length === 0) return res.status(404).json({ error: 'Worker not found' });
    const worker = workerRows[0];

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const totalDaysInMonth = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')} 23:59:59.999`;

    const { rows: logs } = await pool.query(
      `SELECT a.*, d."name" as "divisionName", d2."name" as "secondDivisionName", u."fullName" as "markedByName"
       FROM "Attendance" a
       LEFT JOIN "Division" d ON a."divisionId" = d."id"
       LEFT JOIN "Division" d2 ON a."secondDivisionId" = d2."id"
       LEFT JOIN "User" u ON a."markedById" = u."id"
       WHERE a."workerId" = $1 AND a."date" >= $2::timestamp AND a."date" <= $3::timestamp
       ORDER BY a."date" ASC`,
      [workerId, startDate, endDate]
    );

    const formatToLocalDateStr = (d) => {
      const dt = new Date(d);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const logsByDateStr = {};
    logs.forEach(l => {
      const dStr = formatToLocalDateStr(l.date);
      logsByDateStr[dStr] = l;
    });

    // Fetch declared holidays for this month
    const { rows: holidays } = await pool.query(
      `SELECT "date", "name", "type" FROM "Holiday" WHERE "date" >= $1::timestamp AND "date" <= $2::timestamp`,
      [startDate, endDate]
    );

    const holidaysByDateStr = {};
    holidays.forEach(h => {
      const dStr = formatToLocalDateStr(h.date);
      holidaysByDateStr[dStr] = h;
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysList = [];
    const divisionSummary = {};
    let totalPresent = 0;
    let totalHalfDay = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalOtHours = 0;
    let totalGovtHolidays = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const curDate = new Date(y, m - 1, day);
      const curDateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayName = dayNames[curDate.getDay()];
      const isSunday = curDate.getDay() === 0;
      const declaredHoliday = holidaysByDateStr[curDateStr];

      const log = logsByDateStr[curDateStr];
      let status = log ? log.status : (declaredHoliday ? 'GOVT_HOLIDAY' : (isSunday ? 'HOLIDAY' : 'NOT_MARKED'));
      const otHours = log ? (parseFloat(log.otHours) || 0) : 0;
      
      const div1Name = log?.divisionName || worker.divisionName || 'General';
      const div2Name = log?.secondDivisionName || null;
      let displayDivName = div1Name;
      if (div2Name && div2Name !== div1Name) {
        displayDivName = `${div1Name} (0.5d) + ${div2Name} (0.5d)`;
      }

      if (log) {
        if (log.status === 'PRESENT') {
          totalPresent += 1;
          divisionSummary[div1Name] = (divisionSummary[div1Name] || 0) + 1;
        } else if (log.status === 'HALF_DAY') {
          totalHalfDay += 1;
          if (div2Name && div2Name !== div1Name) {
            // Split across two separate divisions: 0.5 to Div 1 and 0.5 to Div 2!
            divisionSummary[div1Name] = (divisionSummary[div1Name] || 0) + 0.5;
            divisionSummary[div2Name] = (divisionSummary[div2Name] || 0) + 0.5;
          } else {
            divisionSummary[div1Name] = (divisionSummary[div1Name] || 0) + 0.5;
          }
        } else if (log.status === 'ABSENT') {
          totalAbsent += 1;
        } else if (log.status === 'LEAVE') {
          totalLeave += 1;
        }
        totalOtHours += otHours;
      } else if (declaredHoliday) {
        totalGovtHolidays += 1;
        divisionSummary[div1Name] = (divisionSummary[div1Name] || 0) + 1;
      }

      daysList.push({
        dayNumber: day,
        dateStr: curDateStr,
        dayName,
        isSunday,
        isHoliday: !!declaredHoliday,
        holidayName: declaredHoliday ? declaredHoliday.name : null,
        status,
        divisionName: displayDivName,
        primaryDivisionName: div1Name,
        secondDivisionName: div2Name,
        overtimeHours: otHours,
        notes: declaredHoliday ? `🏛️ ${declaredHoliday.name}` : (log?.notes || null),
        markedBy: log?.markedByName || (declaredHoliday ? 'Govt/Company Holiday' : null)
      });
    }

    // Fetch all historical approved payments for this worker to track lifetime advance deduction audit trail
    const { rows: paymentHistory } = await pool.query(
      `SELECT "id", "month", "year", "advanceDeducted", "finalNetAmount", "status", "createdAt", "updatedAt"
       FROM "MonthlyPayment"
       WHERE "workerId" = $1
       ORDER BY "year" DESC, "month" DESC`,
      [workerId]
    );

    res.json({
      worker: {
        id: worker.id,
        empId: worker.workerId,
        fullName: worker.fullName,
        fatherName: worker.fatherName || '-',
        designation: worker.designation || 'Worker',
        mobileNumber: worker.mobileNumber,
        dailyWage: parseFloat(worker.dailyWage),
        dailyAllowance: parseFloat(worker.dailyAllowance || 0),
        advanceTaken: parseFloat(worker.advanceTaken || worker.advanceBalance || 0),
        advanceBalance: parseFloat(worker.advanceBalance || 0),
        otHourlyRate: parseFloat(worker.otHourlyRate || 0),
        defaultDivision: worker.divisionName
      },
      month: m,
      year: y,
      totalDaysInMonth,
      divisionSummary,
      summary: {
        totalPresent,
        totalHalfDay,
        totalAbsent,
        totalLeave,
        totalWorkingDays: totalPresent + (totalHalfDay * 0.5),
        totalOtHours
      },
      paymentHistory: paymentHistory.map(p => ({
        month: p.month,
        year: p.year,
        advanceDeducted: parseFloat(p.advanceDeducted) || 0,
        finalNetAmount: parseFloat(p.finalNetAmount) || 0,
        status: p.status,
        date: p.updatedAt || p.createdAt
      })),
      days: daysList
    });
  } catch (err) {
    console.error('Worker month attendance drilldown error:', err);
    res.status(500).json({ error: 'Failed to fetch register book drilldown' });
  }
});

app.post('/api/wages/approve', authenticateToken, async (req, res) => {
  try {
    const { 
      workerId, 
      month, 
      year, 
      presentDays, 
      absentDays, 
      halfDays, 
      leaveDays, 
      totalOtHours, 
      wagesAmount,
      allowanceAmount,
      grossPayment,
      pfAmount,
      esiAmount,
      netBaseAmount,
      otPayment,
      otAllowance,
      totalPayment,
      advanceDeducted,
      extraAmount,
      finalNetAmount,
      calculatedAmount,
      divisionSummary
    } = req.body;

    if (!workerId || !month || !year) {
      return res.status(400).json({ error: 'Worker ID, Month, and Year are required' });
    }

    if (req.user.role !== 'OWNER' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Wages payouts can only be approved by Owner or Managers' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const pDays = parseFloat(presentDays) || 0;
    const aDays = parseFloat(absentDays) || 0;
    const hDays = parseFloat(halfDays) || 0;
    const lDays = parseFloat(leaveDays) || 0;
    const otH = parseFloat(totalOtHours) || 0;
    const wAmt = parseFloat(wagesAmount) || 0;
    const allAmt = parseFloat(allowanceAmount) || 0;
    const gross = parseFloat(grossPayment) || 0;
    const pf = parseFloat(pfAmount) || 0;
    const esi = parseFloat(esiAmount) || 0;
    const netBase = parseFloat(netBaseAmount) || 0;
    const otPay = parseFloat(otPayment) || 0;
    const otAll = parseFloat(otAllowance) || 0;
    const totPay = parseFloat(totalPayment) || 0;
    const adv = parseFloat(advanceDeducted) || 0;
    const extra = parseFloat(extraAmount) || 0;
    const finalNet = parseFloat(finalNetAmount ?? calculatedAmount) || 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: existingRows } = await client.query(`SELECT "advanceDeducted" FROM "MonthlyPayment" WHERE "workerId" = $1 AND "month" = $2 AND "year" = $3`, [workerId, m, y]);
      const prevAdvanceDeducted = existingRows.length > 0 ? (parseFloat(existingRows[0].advanceDeducted) || 0) : 0;

      const { rows } = await client.query(
        `INSERT INTO "MonthlyPayment" (
           "id", "workerId", "month", "year", "presentDays", "absentDays", "halfDays", "leaveDays", "totalOtHours",
           "wagesAmount", "allowanceAmount", "grossPayment", "pfAmount", "esiAmount", "netBaseAmount",
           "otPayment", "otAllowance", "totalPayment", "advanceDeducted", "extraAmount", "finalNetAmount",
           "calculatedAmount", "divisionSummary", "status", "approvedById", "createdAt", "updatedAt"
         )
         VALUES (
           gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11, $12, $13, $14,
           $15, $16, $17, $18, $19, $20,
           $21, $22, 'APPROVED', $23, NOW(), NOW()
         )
         ON CONFLICT ("workerId", "month", "year")
         DO UPDATE SET
           "presentDays" = EXCLUDED."presentDays",
           "absentDays" = EXCLUDED."absentDays",
           "halfDays" = EXCLUDED."halfDays",
           "leaveDays" = EXCLUDED."leaveDays",
           "totalOtHours" = EXCLUDED."totalOtHours",
           "wagesAmount" = EXCLUDED."wagesAmount",
           "allowanceAmount" = EXCLUDED."allowanceAmount",
           "grossPayment" = EXCLUDED."grossPayment",
           "pfAmount" = EXCLUDED."pfAmount",
           "esiAmount" = EXCLUDED."esiAmount",
           "netBaseAmount" = EXCLUDED."netBaseAmount",
           "otPayment" = EXCLUDED."otPayment",
           "otAllowance" = EXCLUDED."otAllowance",
           "totalPayment" = EXCLUDED."totalPayment",
           "advanceDeducted" = EXCLUDED."advanceDeducted",
           "extraAmount" = EXCLUDED."extraAmount",
           "finalNetAmount" = EXCLUDED."finalNetAmount",
           "calculatedAmount" = EXCLUDED."calculatedAmount",
           "divisionSummary" = EXCLUDED."divisionSummary",
           "status" = 'APPROVED',
           "approvedById" = EXCLUDED."approvedById",
           "updatedAt" = NOW()
         RETURNING *`,
        [
          workerId, m, y, pDays, aDays, hDays, lDays, otH,
          wAmt, allAmt, gross, pf, esi, netBase,
          otPay, otAll, totPay, adv, extra, finalNet,
          finalNet, divisionSummary ? JSON.stringify(divisionSummary) : null, req.user.id
        ]
      );

      if (adv > 0 || prevAdvanceDeducted > 0) {
        await client.query(
          `UPDATE "Worker"
           SET "advanceBalance" = GREATEST(0, COALESCE(NULLIF("advanceBalance", 0), "advanceTaken", 0) + $1 - $2), "updatedAt" = NOW()
           WHERE "id" = $3`,
          [prevAdvanceDeducted, adv, workerId]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Monthly wage payment successfully approved!', payment: rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Failed to approve wage payout' });
  }
});

app.post('/api/wages/whatsapp-link', authenticateToken, async (req, res) => {
  try {
    const { workerName, mobileNumber, month, year, presentDays, halfDays, totalOtHours, extraAmount, calculatedAmount } = req.body;
    if (!workerName || !mobileNumber || !calculatedAmount) {
      return res.status(400).json({ error: 'Name, mobile number, and wage details are required' });
    }

    // Map month number to text
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthText = months[parseInt(month, 10) - 1] || 'Month';

    const extraLine = extraAmount && parseFloat(extraAmount) > 0 ? `\n- Extra Amount: *Rs. ${extraAmount}*` : '';
    const message = `*SRI KRISHNA CONSTRUCTIONS*
------------------------------
Dear *${workerName}*,
Your attendance and payment summary for *${monthText} ${year}* has been calculated and approved:
- Present Days: *${presentDays}*
- Half Days: *${halfDays}*
- OT Hours: *${totalOtHours}*${extraLine}
- Total Approved Wage: *Rs. ${calculatedAmount}*

Your salary payment is approved and is being disbursed. Thank you!`;

    const cleanNumber = mobileNumber.replace(/\+/g, '').trim(); // wa.me accepts without +
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    res.json({ link: waUrl, message });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate WhatsApp link' });
  }
});

// --- FILTER-AWARE EXCEL EXPORT ---
app.post('/api/export/excel', authenticateToken, async (req, res) => {
  try {
    const { category, items } = req.body;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(category || 'Stock Data');

    if (category === 'IAC_CHICAGO') {
      worksheet.columns = [
        { header: 'Sl No', key: 'slNo', width: 8 },
        { header: 'Item Code', key: 'itemCode', width: 15 },
        { header: 'Item Name / Spec', key: 'itemName', width: 45 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Brand Offered', key: 'brandOffered', width: 20 },
        { header: '% GST Included', key: 'gstPercentage', width: 15 },
        { header: 'HSN', key: 'hsnCode', width: 15 },
        { header: 'Bidders Compliance', key: 'biddersCompliance', width: 20 },
        { header: 'Current Stock', key: 'currentStock', width: 15 },
      ];
    } else if (category === 'KIRLOSKAR_ANNEXURE') {
      worksheet.columns = [
        { header: 'Sl. No.', key: 'slNo', width: 8 },
        { header: 'Item Code', key: 'itemCode', width: 15 },
        { header: 'Item Name', key: 'itemName', width: 30 },
        { header: 'Part No.', key: 'partNo', width: 18 },
        { header: 'Item Specifications', key: 'specifications', width: 35 },
        { header: 'UOM', key: 'unit', width: 10 },
        { header: 'Basic Rate (Rs)', key: 'basicRateRs', width: 16 },
        { header: 'Basic Rate Alt', key: 'basicRateRsAlt', width: 16 },
        { header: 'SKC Rate 1', key: 'skcRate1', width: 14 },
        { header: 'SKC Rate 2', key: 'skcRate2', width: 14 },
        { header: 'Diff %', key: 'diffPercentage', width: 12 },
        { header: 'Current Stock', key: 'currentStock', width: 15 },
      ];
    } else if (category === 'TAC_CHICAGO') {
      worksheet.columns = [
        { header: 'Sno', key: 'slNo', width: 8 },
        { header: 'Item Code', key: 'itemCode', width: 15 },
        { header: 'Item Name / Spec', key: 'itemName', width: 50 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'SKC Rate', key: 'skcRate1', width: 15 },
        { header: 'Current Stock', key: 'currentStock', width: 15 },
      ];
    } else {
      // KIRLOSKAR_UNIT4
      worksheet.columns = [
        { header: 'Sl. No.', key: 'slNo', width: 8 },
        { header: 'Item Code', key: 'itemCode', width: 15 },
        { header: 'Item Name', key: 'itemName', width: 35 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Qty', key: 'baseQty', width: 10 },
        { header: 'Item Specifications', key: 'specifications', width: 45 },
        { header: 'Current Stock', key: 'currentStock', width: 15 },
      ];
    }

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' },
    };

    items.forEach((item, index) => {
      worksheet.addRow({ slNo: index + 1, ...item });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${category}_stocks.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export Excel error:', err);
    res.status(500).json({ error: 'Failed to generate Excel download' });
  }
});

// --- DATABASE BACKUP API ---
app.post('/api/backup/database', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: 'DATABASE_URL not configured' });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `sri_krishna_backup_${timestamp}.sql`;
    
    const dumpOutput = execSync(`pg_dump "${dbUrl}" --no-owner --no-privileges`, {
      encoding: 'utf-8',
      maxBuffer: 100 * 1024 * 1024,
      timeout: 120000
    });

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(dumpOutput);
  } catch (err) {
    console.error('Database backup error:', err.message);
    res.status(500).json({ error: 'Failed to generate database backup. Ensure pg_dump is installed and DATABASE_URL is correct.' });
  }
});

// --- JSON DATA EXPORT BACKUP ---
app.get('/api/backup/json-export', authenticateToken, requireRoles(['OWNER']), async (req, res) => {
  try {
    const [users, divisions, workers, purchaseOrders, poItems, purchases, sales, attendance, payments, approvals] = await Promise.all([
      pool.query('SELECT "id","username","fullName","mobileNumber","role","createdAt" FROM "User" ORDER BY "createdAt"'),
      pool.query('SELECT * FROM "Division" ORDER BY "name"'),
      pool.query('SELECT * FROM "Worker" ORDER BY "fullName"'),
      pool.query('SELECT * FROM "PurchaseOrder" ORDER BY "date" DESC'),
      pool.query('SELECT * FROM "PurchaseOrderItem" ORDER BY "id"'),
      pool.query('SELECT * FROM "Purchase" ORDER BY "date" DESC'),
      pool.query('SELECT * FROM "Sale" ORDER BY "invoiceDate" DESC'),
      pool.query('SELECT * FROM "Attendance" ORDER BY "date" DESC LIMIT 50000'),
      pool.query('SELECT * FROM "MonthlyPayment" ORDER BY "year" DESC, "month" DESC'),
      pool.query('SELECT * FROM "ApprovalRequest" ORDER BY "createdAt" DESC')
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      softwareName: 'Sri Krishna Constructions ERP',
      version: '1.0.0',
      data: {
        users: users.rows,
        divisions: divisions.rows,
        workers: workers.rows,
        purchaseOrders: purchaseOrders.rows,
        purchaseOrderItems: poItems.rows,
        purchases: purchases.rows,
        sales: sales.rows,
        attendance: attendance.rows,
        monthlyPayments: payments.rows,
        approvalRequests: approvals.rows
      },
      recordCounts: {
        users: users.rows.length,
        divisions: divisions.rows.length,
        workers: workers.rows.length,
        purchaseOrders: purchaseOrders.rows.length,
        purchaseOrderItems: poItems.rows.length,
        purchases: purchases.rows.length,
        sales: sales.rows.length,
        attendance: attendance.rows.length,
        monthlyPayments: payments.rows.length,
        approvalRequests: approvals.rows.length
      }
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="sri_krishna_backup_${timestamp}.json"`);
    res.json(backup);
  } catch (err) {
    console.error('JSON export error:', err.message);
    res.status(500).json({ error: 'Failed to generate JSON export backup' });
  }
});

// SPA Fallback Route for React App on Port 5000
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// START SERVER AND RUN AUTO MIGRATIONS & SEEDING
app.listen(PORT, async () => {
  console.log(`🚀 IAC Stocks Server running on port ${PORT}`);
  try {
    // 1. Automatically create all PostgreSQL tables via raw SQL if they do not exist
    await initializeDatabaseTables();

    // 2. Run seed baseline data to ensure default owner exists
    await seedBaselineData();
    console.log('✅ Auto startup database seeding completed!');
  } catch (err) {
    console.error('Database startup log:', err.message);
  }
});
