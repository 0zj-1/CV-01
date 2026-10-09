// Latin shape substitutions; reference transcriptions live in shot-audit, not here.
export const GLYPHS={
 alphabet:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',numbers:'0123456789',
 wide:['M','W','O','Q','G'],narrow:['I','J','L','T'],diagonal:['A','V','W','X','Y','K'],
 identity:'MSCHN',stack:['N','CHN','MSCHN','CHN','N'],scatter:'MAWNH',
 largeM:'M',largeMS:'MS',thinGrid:['M45','CH1','NR'],
 alphabetRows:['abbrrra','eexsnnk','knm','honpcty','yfxuhw','wu','bmbmm','see','iijhorm'],
 greekRows:['AOE','YU','HA','LOK'],
 italic:'Italic',italicGrid:['IT4','L1C','10'],weights:['5 We','ights','ights','5 We'],
 smallGrid:['MSCHN','MAWNH',"MHXAN'H",'MSCHN','MAWNH',"MHXAN'H",'MSCHN','MAWNH',"MHXAN'H",'MSCHN','MAWNH',"MHXAN'H",'MSCHN'],
 masked:'X',machineWord:'XOL',mechanic:['MEC','HA','NIC'],
 languageGrid:['MSCHN','TYPEFACE','LATIN','LATIN','TYPEFACE','MSCHN'],
 giantSequence:['X','E','B','U','N'],variable:['Va','Ria','R','BL3'],
 scatterField:['M','E','C','N'],smallScatter:'MSCHN',
 // Alternate states are graphic shapes. They are not extra editable Portfolio copy.
 alternates:['H','X','A','4','I','1','3','T','C','R','O','0','-','2','7','8','5','6'],
 year:'2025',
} as const;
export const GLYPH_MATCH={
 X:{glyphScale:1,glyphOffsetX:0,glyphOffsetY:0},
 A:{glyphScale:1,glyphOffsetX:0,glyphOffsetY:0},
 O:{glyphScale:1,glyphOffsetX:0,glyphOffsetY:0},
 E:{glyphScale:1,glyphOffsetX:0,glyphOffsetY:0},
 U:{glyphScale:1,glyphOffsetX:0,glyphOffsetY:0},
} as const;
