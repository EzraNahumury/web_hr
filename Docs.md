KOLOM - KOLOM YANG DI PERLUKAN 
I = gaji pokok
 J = gaji pokok perhari/perjam
 K = tunjangan jabatan
 L = uang makan
 M = subsidi
 N = uang kerajinan
 O = bpjs
 P = bonus performa
 Q = hari kerja
 R = masuk
 S = total gaji pokok
 T = omzet
 U = uang makan
 V = kerajinan
 W = lembur
 X = bonus
 Y = izin/off
 Z = sakit
 AA = sakit tanpa surat
 AB = 1/2 hari
 AC = potongan
 AD = telat
 AE = potongan
 AF = total gaji
 AG = total gaji sebelum potongan
 AH = kontrak
 AI = pinjaman perusahaan
 AJ = pinjaman pribadi
 AK = potongan denda
 AL = potongan kontrak
 AM = potongan pinjaman
 AN = potongan uang kerajinan
 AO = penerimaan bersih




INPUTAN FORM : khusus karyawan ( ga termasuk sales)
1. Gaji Pokok Pehari/Perjam
2. Tunjangan Jabatan
3. Uang Makan
4. Subsidi
5. Uang Kerajinan
6. BPJS
7. Bonus Performa
======
8. Total Omzet ( 1x isi aja  for all employee)
======
untuk sales ga dpt 7 dan 8 , tetapi di ganti
insentif
uang transport














SISTEM : 
1. GAJI POKOK ( totak gaji pokok + tunjangan jabatan +  uang makan  + subsidi + uang kerajinan + omset + BPJS )
2. Hari Kerja ( Otomatis dari system sebesar normalnya 25 hari tapi menyesuaikan bulan ) contoh : 26 january ke 25 febuary 27 hari
3. Masuk ( system cek di absensi ( berlaku dari tgl 26 - 25 brp)
4. Total Gaji Pokok (Gaji Pokok Pehari/Perjam total * masuk)
5. Omset

(ambil dari column jabatan tabel karyawan)
kepala == secretary and manager
admin = supervisor
staf = staf


if ( kepala ) {
	(bonus omset / total karyawan) * 70%
}
 else-if (admin) {
	(bonus omset / total karyawan) * 50%
}
else-if(staff){
	(bonus omset / total karyawan) * 25%
}

6. Uang Makan ( uang makan * masuk )
7. Kerajinan 

if ( masuk + sakit == 25 or   menyesuaikan hari kayak hari kerja) {
	10% x gaji pokok
}
else {
	0
}


8. Lembur ( by system ( hitungannya per setengah jam) mulai berlaku setngah jam pertama)
9. bonus - lembur ( lembur per jam x 20 rb)
10. izin / off ( system absensi)
11. sakit ( system absensi)
12. sakit tanpa surat ( system absensi)
13. setengah hari ( system absensi)
14. potongan - setengah hari (Gaji Pokok perhari/perjam / 2 * setengah hari)
15. Telat ( system absensi)
16. potongan telat (20 rb x telat)
17. Bonus Omzet ( total omzet x 0.5%) x 100%
17. Total Gaji  (total gaji pokok + tunjangan jabatan +  uang makan  + subsidi + bonus peforma +  uang kerajinan + omset + BPJS + Bonus lembur - potongan setengah hari - potongan telat )
18. Total gaji sebelum potongan (total gaji pokok + tunjangan jabatan +  uang makan  + subsidi + bonus peforma +  uang kerajinan + omset + BPJS + Bonus lembur )

data karyawan waktu input : sistem otomatis memberlakukan potongan setelah 3 bulan training ( bulan ke 4 - 8 akan langsung di terapkan potongan kontraknya)

19. kontrak : bulan ke 4 - 8 ( 200 rb / bulan)
20. pinjaman perusahaan : potongan tiap bulan 
21. pinjaman pribadi : ga di pakai
22. potongan denda ( potongan setengah hari + potongan telat + (uang kerajinan - kerajinan )
23. potongan kontrak ( sama dengan kontrak)
24. potongan pinjaman (sama dengan pinjaman perusahaan)
25. potongan kerajinan ( uang kerajinan - kerajinan)
26. penerimaan bersih (total gaji - kontrak - pinjaman perusahaan)

