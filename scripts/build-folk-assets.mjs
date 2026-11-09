import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { appendCostEvent, createCostEvent } from "./lib/cost-ledger.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MASTER_DIR = join(ROOT, "assets", "folk-pilot", "masters");
const PUBLIC_DIR = join(ROOT, "apps", "web", "public", "assets", "folk-pilot");
const PART_DIR = join(PUBLIC_DIR, "parts");
const MASTER_PNG_DIR = join(PUBLIC_DIR, "masters");
const OUTLINE = "#2a1710";

const palette = {
  outline: OUTLINE,
  skin: "#c98254",
  skinShade: "#a9633c",
  skinLight: "#e0a06b",
  ochre: "#d39a3d",
  ochreDark: "#b77a2b",
  indigo: "#29445f",
  indigoLight: "#3e6385",
  cream: "#f2e3c6",
  creamShade: "#dcc9a4",
  terracotta: "#b55034",
  terracottaDark: "#8f3a26",
  gold: "#e0b354",
  goldDark: "#b8872f",
  saffron: "#cf5a32",
  shoe: "#5a2f1d",
  hair: "#332018",
};

function hash(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function part(id, content, extra = "") {
  return `<g id="part-${id}" data-part="${id}" ${extra}>${content}</g>`;
}

function capsule(x1, y1, x2, y2, width, fill) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${OUTLINE}" stroke-width="${width + 14}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fill}" stroke-width="${width}" stroke-linecap="round"/>`;
}

function joint(x, y, radius, fill, ring = palette.gold) {
  return `<circle cx="${x}" cy="${y}" r="${radius + 7}" fill="${OUTLINE}"/><circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}"/><circle cx="${x}" cy="${y}" r="${radius - 5}" fill="none" stroke="${ring}" stroke-width="4"/>`;
}

function artisanSvg() {
  const p = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100">
  <defs>
    <pattern id="coatDots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="6" r="2.2" fill="${p.gold}" opacity="0.85"/>
      <circle cx="19" cy="18" r="1.4" fill="${p.cream}" opacity="0.65"/>
    </pattern>
    <pattern id="dhotiLines" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
      <line x1="0" y1="0" x2="0" y2="34" stroke="${p.creamShade}" stroke-width="2" opacity="0.7"/>
    </pattern>
  </defs>

  ${part(
    "turbanTail",
    `<path d="M430 300 C360 330 340 410 350 500 C356 548 380 566 404 548 C420 536 414 506 402 480 C382 430 398 370 452 340 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="8" stroke-linejoin="round"/>
     <path d="M425 330 C382 370 374 430 386 490" fill="none" stroke="${p.gold}" stroke-width="6" stroke-dasharray="10 12" opacity="0.8"/>`,
  )}

  ${part(
    "farUpperArm",
    `${capsule(415, 475, 432, 610, 48, p.indigo)}
     <path d="M398 520 L438 532" stroke="${p.gold}" stroke-width="6"/>
     ${joint(432, 610, 25, p.indigoLight)}`,
  )}
  ${part(
    "farForearm",
    `${capsule(432, 610, 442, 742, 39, p.skinShade)}
     <path d="M426 690 l22 0 M424 706 l22 0" stroke="${p.gold}" stroke-width="4"/>
     ${joint(442, 742, 21, p.skinShade)}`,
  )}
  ${part(
    "farHand",
    `<path d="M427 738 C414 754 414 786 432 800 C446 811 464 802 468 786 C472 772 460 760 450 750 Z" fill="${p.skinShade}" stroke="${OUTLINE}" stroke-width="7"/>
     <path d="M434 762 C428 776 432 790 442 796" fill="none" stroke="${p.skinLight}" stroke-width="4"/>`,
  )}

  ${part(
    "farDhoti",
    `<path d="M365 650 C350 716 352 798 372 850 C394 884 444 882 458 846 C466 808 450 720 436 662 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M372 700 C400 712 428 710 452 698 M368 760 C398 776 430 774 458 758" fill="none" stroke="${p.creamShade}" stroke-width="4"/>
     <path d="M358 838 C384 856 430 858 456 838" fill="none" stroke="${p.indigo}" stroke-width="10"/>`,
  )}
  ${part(
    "farThigh",
    `${capsule(405, 670, 402, 824, 54, p.cream)}
     <path d="M378 730 C398 740 420 740 438 730" fill="none" stroke="${p.creamShade}" stroke-width="4"/>
     ${joint(402, 824, 25, p.creamShade, p.indigo)}`,
  )}
  ${part(
    "farShin",
    `${capsule(402, 824, 398, 978, 40, p.skinShade)}
     <path d="M386 900 C398 906 412 906 422 900" fill="none" stroke="${p.gold}" stroke-width="5"/>
     ${joint(398, 978, 22, p.skinShade, p.gold)}`,
  )}
  ${part(
    "farFoot",
    `<path d="M380 972 C380 950 414 944 430 962 C442 976 476 982 492 998 C500 1008 494 1020 478 1020 L388 1020 C376 1020 370 1000 380 972 Z" fill="${p.shoe}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M390 996 C420 1004 458 1004 486 996" fill="none" stroke="${p.gold}" stroke-width="5"/>`,
  )}

  ${part(
    "torso",
    `<path d="M356 446 C380 414 446 400 506 414 C540 422 552 452 548 492 L532 636 C528 668 500 680 456 680 C410 680 376 666 370 634 L354 496 C350 472 350 458 356 446 Z" fill="${p.ochre}" stroke="${OUTLINE}" stroke-width="9" stroke-linejoin="round"/>
     <path d="M390 426 C410 470 414 530 402 600 L430 664 L468 672 L452 590 C440 528 448 466 480 424 Z" fill="url(#coatDots)" opacity="0.65"/>
     <path d="M356 446 C382 470 396 510 398 548 L380 610" fill="none" stroke="${p.terracotta}" stroke-width="14" stroke-linecap="round"/>
     <path d="M506 414 C498 456 500 496 518 536 L532 600" fill="none" stroke="${p.indigo}" stroke-width="16" stroke-linecap="round"/>
     <path d="M506 414 C528 424 542 444 544 468" fill="none" stroke="${p.cream}" stroke-width="5"/>
     <path d="M430 452 L430 640" stroke="${p.ochreDark}" stroke-width="3" opacity="0.6"/>
     <circle cx="488" cy="476" r="5" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="2"/>
     <circle cx="494" cy="516" r="5" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="2"/>
     <circle cx="500" cy="556" r="5" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="2"/>
     <path d="M400 640 C424 650 468 654 508 642" fill="none" stroke="${p.terracotta}" stroke-width="8"/>`,
  )}

  ${part(
    "sash",
    `<path d="M362 622 C402 644 492 650 536 626 L542 668 C498 690 404 686 360 662 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M370 638 C412 656 488 660 530 640" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="12 8"/>
     <path d="M520 658 C556 684 566 736 548 778 C540 796 522 794 522 774 C522 744 512 706 498 680 Z" fill="${p.terracottaDark}" stroke="${OUTLINE}" stroke-width="7"/>`,
  )}

  ${part(
    "pelvis",
    `<path d="M364 648 C400 670 486 674 530 648 L536 744 C520 786 470 800 420 788 C384 780 362 760 358 728 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M370 696 C412 716 486 718 528 696 M376 742 C416 760 488 760 522 742" fill="none" stroke="${p.creamShade}" stroke-width="4"/>
     <path d="M414 660 C430 700 432 744 424 786 M472 660 C458 700 456 744 466 786" fill="none" stroke="${p.creamShade}" stroke-width="3" opacity="0.7"/>`,
  )}

  ${part(
    "nearDhoti",
    `<path d="M416 652 C428 714 430 792 414 848 C400 890 452 902 486 872 C512 850 520 786 512 724 L496 664 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M424 708 C452 720 486 718 510 704 M418 766 C452 782 490 778 516 758 M424 824 C454 838 488 834 512 816" fill="none" stroke="${p.creamShade}" stroke-width="4"/>
     <path d="M416 846 C442 862 486 860 510 840" fill="none" stroke="${p.indigo}" stroke-width="10"/>`,
  )}
  ${part(
    "nearThigh",
    `${capsule(470, 670, 476, 824, 58, p.cream)}
     <path d="M444 722 C464 732 490 732 510 722" fill="none" stroke="${p.creamShade}" stroke-width="4"/>
     ${joint(476, 824, 26, p.creamShade, p.indigo)}`,
  )}
  ${part(
    "nearShin",
    `${capsule(476, 824, 480, 978, 43, p.skin)}
     <path d="M462 900 C474 906 492 906 504 900" fill="none" stroke="${p.gold}" stroke-width="6"/>
     ${joint(480, 978, 23, p.skin, p.gold)}`,
  )}
  ${part(
    "nearFoot",
    `<path d="M462 972 C462 948 498 942 514 962 C526 976 562 982 578 998 C586 1008 580 1020 564 1020 L472 1020 C458 1020 452 1000 462 972 Z" fill="${p.shoe}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M472 996 C504 1004 546 1004 572 996" fill="none" stroke="${p.gold}" stroke-width="5"/>`,
  )}

  ${part(
    "neck",
    `<path d="M444 388 L500 388 L506 452 C490 468 458 468 440 452 Z" fill="${p.skin}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M452 438 C466 446 482 446 498 436" fill="none" stroke="${p.skinShade}" stroke-width="4"/>`,
  )}

  ${part(
    "necklace",
    `<path d="M430 430 C452 462 500 462 522 428" fill="none" stroke="${p.gold}" stroke-width="10"/>
     <path d="M430 430 C452 462 500 462 522 428" fill="none" stroke="${p.outline}" stroke-width="3" stroke-dasharray="2 10"/>
     <circle cx="476" cy="458" r="8" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="3"/>
     <circle cx="476" cy="458" r="3" fill="${p.gold}"/>`,
  )}

  ${part(
    "head",
    `<path d="M432 300 C432 258 460 238 490 244 C514 248 528 268 530 292 C532 306 542 312 550 320 C560 330 552 342 540 344 L536 360 C534 374 522 382 508 386 L514 414 C492 430 456 426 438 408 L436 372 C424 356 424 326 432 300 Z" fill="${p.skin}" stroke="${OUTLINE}" stroke-width="9" stroke-linejoin="round"/>
     <path d="M438 300 C448 286 470 278 492 282 C506 284 516 292 520 304" fill="none" stroke="${p.skinShade}" stroke-width="4" opacity="0.75"/>
     <path d="M528 330 C536 334 538 340 532 344" fill="none" stroke="${p.outline}" stroke-width="4"/>
     <ellipse cx="444" cy="318" rx="18" ry="26" fill="${p.skin}" stroke="${OUTLINE}" stroke-width="7"/>
     <path d="M438 312 C446 308 450 316 446 322" fill="none" stroke="${p.skinShade}" stroke-width="3"/>`,
  )}

  ${part(
    "eye",
    `<path d="M478 302 C492 292 508 294 516 306 C506 316 490 318 478 310 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="4"/>
     <circle cx="500" cy="305" r="7" fill="${p.hair}"/>
     <circle cx="502" cy="303" r="2.4" fill="${p.cream}"/>`,
  )}
  ${part(
    "eyelid",
    `<path d="M478 302 C492 292 508 294 516 306 C506 316 490 318 478 310 Z" fill="${p.skin}" stroke="${OUTLINE}" stroke-width="4"/>`,
    'data-variant="alternate"',
  )}
  ${part(
    "brow",
    `<path d="M470 286 C486 276 510 278 522 290" fill="none" stroke="${p.hair}" stroke-width="9" stroke-linecap="round"/>`,
  )}
  ${part(
    "mustache",
    `<path d="M514 354 C524 348 540 350 548 360 C536 362 526 366 518 372 C512 366 510 360 514 354 Z" fill="${p.hair}" stroke="${OUTLINE}" stroke-width="3"/>
     <path d="M512 344 C520 340 528 342 534 348" fill="none" stroke="${p.hair}" stroke-width="3"/>`,
  )}
  ${part(
    "earring",
    `<circle cx="444" cy="346" r="10" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="3"/>
     <path d="M444 356 L444 372" stroke="${p.gold}" stroke-width="5"/>
     <circle cx="444" cy="380" r="9" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="3"/>`,
  )}

  ${part(
    "turban",
    `<path d="M416 272 C400 238 430 196 470 190 C512 184 546 208 548 244 C550 266 538 284 520 292 C504 300 476 298 458 290 C440 282 426 282 416 272 Z" fill="${p.saffron}" stroke="${OUTLINE}" stroke-width="9" stroke-linejoin="round"/>
     <path d="M412 256 C444 270 500 272 544 252" fill="none" stroke="${p.cream}" stroke-width="14"/>
     <path d="M414 258 C446 272 500 274 542 254" fill="none" stroke="${p.indigo}" stroke-width="6"/>
     <path d="M430 220 C456 236 494 238 526 224" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="8 8"/>
     <path d="M516 200 L552 182" stroke="${p.gold}" stroke-width="6"/>
     <circle cx="554" cy="180" r="7" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="3"/>
     <path d="M452 196 C470 208 492 212 516 208" fill="none" stroke="${p.cream}" stroke-width="4" opacity="0.7"/>`,
  )}

  ${part(
    "shoulderSash",
    `<path d="M494 410 C520 420 532 444 526 470 C516 502 500 520 486 534 C494 498 492 462 476 432 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="7"/>
     <path d="M500 424 C514 438 516 458 508 478" fill="none" stroke="${p.gold}" stroke-width="4" stroke-dasharray="8 7"/>`,
  )}

  ${part(
    "nearUpperArm",
    `${capsule(508, 470, 532, 610, 52, p.indigo)}
     <path d="M494 512 L544 528" stroke="${p.gold}" stroke-width="6"/>
     <path d="M500 548 L544 560" stroke="${p.cream}" stroke-width="4" opacity="0.7"/>
     ${joint(532, 610, 26, p.indigoLight)}`,
  )}
  ${part(
    "nearForearm",
    `${capsule(532, 610, 548, 742, 42, p.skin)}
     <path d="M522 682 L558 694" stroke="${p.gold}" stroke-width="5"/>
     <path d="M526 704 L560 714" stroke="${p.gold}" stroke-width="5"/>
     ${joint(548, 742, 22, p.skin)}`,
  )}
  ${part(
    "handOpen",
    `<path d="M532 736 C518 752 518 782 536 796 C550 806 566 798 570 782 C574 766 562 752 552 744 Z" fill="${p.skin}" stroke="${OUTLINE}" stroke-width="7"/>
     <path d="M540 758 C534 772 536 786 544 792 M550 754 C546 770 548 782 554 788 M558 754 C556 768 558 778 562 784" fill="none" stroke="${p.skinShade}" stroke-width="3"/>`,
  )}
  ${part(
    "handGrip",
    `<path d="M530 738 C516 752 518 780 536 792 C552 802 568 792 570 776 C572 762 562 748 552 742 Z" fill="${p.skin}" stroke="${OUTLINE}" stroke-width="7"/>
     <path d="M536 758 C548 754 560 760 562 772 C564 784 552 792 540 788 C530 784 528 768 536 758 Z" fill="${p.skinShade}" stroke="${OUTLINE}" stroke-width="4"/>
     <path d="M542 762 L556 766 M540 772 L558 776" stroke="${p.skinLight}" stroke-width="3"/>`,
    'data-variant="alternate"',
  )}
</svg>`;
}

function horseSvg() {
  const p = palette;
  const body = "#e8cda0";
  const bodyShade = "#c9a878";
  const mane = "#a94f32";
  const hoof = "#4a2a1b";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="950" viewBox="0 0 1400 950">
  <defs>
    <pattern id="horseDots" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="3" fill="${p.terracotta}" opacity="0.55"/>
      <circle cx="22" cy="20" r="1.6" fill="${p.indigo}" opacity="0.55"/>
    </pattern>
    <pattern id="blanketPattern" width="34" height="34" patternUnits="userSpaceOnUse">
      <path d="M0 17 L17 0 L34 17 L17 34 Z" fill="none" stroke="${p.gold}" stroke-width="2" opacity="0.8"/>
    </pattern>
  </defs>

  ${part(
    "tailBase",
    `<path d="M452 380 C390 392 336 450 310 532 C296 574 310 606 334 612 C356 618 366 594 358 570 C344 526 376 456 470 426 Z" fill="${mane}" stroke="${OUTLINE}" stroke-width="8" stroke-linejoin="round"/>
     <path d="M410 424 C372 468 350 522 348 574" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="10 12"/>`,
  )}
  ${part(
    "tailTuft",
    `<path d="M314 556 C276 596 258 664 276 720 C292 768 336 780 356 748 C374 718 360 684 342 660 C322 632 320 596 338 568 Z" fill="${p.terracottaDark}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M310 620 C300 662 306 706 326 736 M334 606 C322 650 326 692 344 720" fill="none" stroke="${mane}" stroke-width="5"/>`,
  )}

  ${part(
    "farFrontUpper",
    `${capsule(790, 520, 792, 680, 48, bodyShade)}
     ${joint(792, 680, 22, bodyShade, p.indigo)}`,
  )}
  ${part(
    "farFrontLower",
    `${capsule(792, 680, 796, 824, 33, bodyShade)}
     <path d="M780 744 C792 750 806 750 816 744" fill="none" stroke="${p.indigo}" stroke-width="5"/>
     ${joint(796, 824, 18, bodyShade, p.indigo)}`,
  )}
  ${part(
    "farFrontHoof",
    `<path d="M778 816 C778 852 790 894 814 894 C832 894 836 852 830 816 Z" fill="${hoof}" stroke="${OUTLINE}" stroke-width="7"/>`,
  )}
  ${part(
    "farHindUpper",
    `${capsule(448, 520, 452, 680, 52, bodyShade)}
     ${joint(452, 680, 24, bodyShade, p.indigo)}`,
  )}
  ${part(
    "farHindLower",
    `${capsule(452, 680, 458, 824, 35, bodyShade)}
     <path d="M442 744 C456 750 472 750 482 744" fill="none" stroke="${p.indigo}" stroke-width="5"/>
     ${joint(458, 824, 19, bodyShade, p.indigo)}`,
  )}
  ${part(
    "farHindHoof",
    `<path d="M440 816 C440 852 454 894 478 894 C494 894 498 852 492 816 Z" fill="${hoof}" stroke="${OUTLINE}" stroke-width="7"/>`,
  )}

  ${part(
    "torso",
    `<path d="M438 390 C470 344 550 322 646 326 C738 330 812 354 868 396 C906 426 918 470 902 514 C884 562 824 592 746 604 C652 620 548 610 486 578 C426 548 400 500 404 452 C406 424 416 404 438 390 Z" fill="${body}" stroke="${OUTLINE}" stroke-width="10" stroke-linejoin="round"/>
     <path d="M478 390 C520 366 592 354 668 358 C744 362 808 384 850 420" fill="none" stroke="${bodyShade}" stroke-width="5" opacity="0.8"/>
     <path d="M492 552 C520 576 580 590 650 590" fill="none" stroke="${bodyShade}" stroke-width="4" opacity="0.6"/>
     <path d="M490 430 C540 412 620 406 690 416 C732 422 766 436 788 454 L770 548 C724 570 650 578 580 566 C540 558 506 542 486 522 Z" fill="url(#horseDots)" opacity="0.55"/>
     <path d="M438 390 C470 344 550 322 646 326 C738 330 812 354 868 396" fill="none" stroke="${p.terracotta}" stroke-width="7" opacity="0.5"/>`,
  )}

  ${part(
    "mane",
    `<path d="M864 384 C902 350 936 306 974 264 C990 246 1012 250 1018 270 C1024 292 1008 306 994 320 C966 350 944 386 932 430 C926 452 902 456 892 438 C882 420 876 400 864 384 Z" fill="${mane}" stroke="${OUTLINE}" stroke-width="8" stroke-linejoin="round"/>
     <path d="M918 330 C936 300 960 274 986 258 M900 372 C922 344 944 318 966 298" fill="none" stroke="${p.terracottaDark}" stroke-width="6"/>`,
  )}

  ${part(
    "farEar",
    `<path d="M1024 198 C1012 162 1020 132 1044 116 C1058 140 1060 170 1052 198 Z" fill="${bodyShade}" stroke="${OUTLINE}" stroke-width="7"/>
     <path d="M1038 148 C1042 162 1044 178 1042 190" fill="none" stroke="${mane}" stroke-width="5"/>`,
  )}

  ${part(
    "neck",
    `<path d="M862 398 C890 362 924 320 962 286 C992 258 1024 248 1050 262 C1074 276 1082 306 1066 332 C1044 368 1010 404 980 438 C948 474 918 500 890 510 C862 520 836 502 834 474 C832 444 842 418 862 398 Z" fill="${body}" stroke="${OUTLINE}" stroke-width="10" stroke-linejoin="round"/>
     <path d="M884 442 C918 402 952 366 990 336 C1010 320 1030 314 1048 318" fill="none" stroke="${bodyShade}" stroke-width="5" opacity="0.8"/>
     <path d="M900 466 C928 438 956 408 982 380" fill="none" stroke="${p.terracotta}" stroke-width="5" opacity="0.4"/>`,
  )}

  ${part(
    "head",
    `<path d="M1002 248 C1020 220 1050 208 1074 218 C1092 226 1102 246 1104 266 C1106 286 1120 296 1144 304 C1164 310 1174 326 1168 342 C1162 360 1144 368 1120 368 L1084 372 C1068 390 1046 394 1028 384 C1008 372 998 348 1000 322 Z" fill="${body}" stroke="${OUTLINE}" stroke-width="10" stroke-linejoin="round"/>
     <path d="M1106 266 C1124 272 1140 282 1150 294" fill="none" stroke="${bodyShade}" stroke-width="5"/>
     <path d="M1128 348 C1142 346 1154 340 1162 332" fill="none" stroke="${p.terracottaDark}" stroke-width="5"/>
     <ellipse cx="1120" cy="344" rx="7" ry="5" fill="${p.terracottaDark}" opacity="0.8"/>`,
  )}

  ${part(
    "nearEar",
    `<path d="M1048 208 C1042 172 1054 142 1082 130 C1092 158 1088 188 1074 212 Z" fill="${body}" stroke="${OUTLINE}" stroke-width="7"/>
     <path d="M1064 164 C1068 178 1068 192 1064 202" fill="none" stroke="${mane}" stroke-width="5"/>`,
  )}
  ${part(
    "eye",
    `<path d="M1046 268 C1058 258 1076 260 1084 272 C1072 282 1054 282 1046 274 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="4"/>
     <circle cx="1068" cy="270" r="7" fill="${p.hair}"/>
     <circle cx="1070" cy="268" r="2.2" fill="${p.cream}"/>`,
  )}
  ${part(
    "forelock",
    `<path d="M1024 236 C1030 202 1052 184 1080 186 C1070 208 1062 228 1058 248 C1046 250 1034 246 1024 236 Z" fill="${mane}" stroke="${OUTLINE}" stroke-width="7"/>`,
  )}

  ${part(
    "harnessCollar",
    `<path d="M892 360 C928 380 948 424 944 470 C940 512 920 548 892 564 L864 520 C892 496 904 460 900 424 C898 398 890 378 878 366 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M896 376 C918 402 922 444 908 484" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="9 8"/>
     <circle cx="900" cy="492" r="12" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="4"/>`,
  )}

  ${part(
    "saddleBlanket",
    `<path d="M604 336 C664 320 744 320 800 340 L786 474 C736 494 660 496 608 476 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M622 350 C676 338 740 338 786 352 L776 456 C728 470 666 470 620 456 Z" fill="url(#blanketPattern)" opacity="0.9"/>
     <path d="M610 482 L598 528 M634 486 L626 532 M680 490 L676 538 M726 490 L726 538 M772 486 L778 532 M790 480 L804 526" stroke="${p.gold}" stroke-width="5" stroke-linecap="round"/>
     <path d="M604 336 C664 320 744 320 800 340" fill="none" stroke="${p.gold}" stroke-width="5"/>`,
  )}

  ${part(
    "harnessStrap",
    `<path d="M560 488 C640 520 736 520 812 486" fill="none" stroke="${OUTLINE}" stroke-width="16"/>
     <path d="M560 488 C640 520 736 520 812 486" fill="none" stroke="${p.terracotta}" stroke-width="10"/>
     <circle cx="690" cy="512" r="13" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="4"/>`,
  )}

  ${part(
    "bridle",
    `<path d="M1048 232 C1064 264 1072 298 1078 330" fill="none" stroke="${OUTLINE}" stroke-width="12"/>
     <path d="M1048 232 C1064 264 1072 298 1078 330" fill="none" stroke="${p.indigo}" stroke-width="7"/>
     <path d="M1080 306 C1106 310 1132 320 1150 334 L1144 356 C1122 342 1098 334 1074 332 Z" fill="none" stroke="${OUTLINE}" stroke-width="12"/>
     <path d="M1080 306 C1106 310 1132 320 1150 334 L1144 356 C1122 342 1098 334 1074 332 Z" fill="none" stroke="${p.indigo}" stroke-width="7"/>
     <path d="M1080 330 C1098 346 1114 354 1132 356" fill="none" stroke="${p.indigo}" stroke-width="6"/>
     <circle cx="1102" cy="340" r="8" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="3"/>`,
  )}

  ${part(
    "nearFrontUpper",
    `${capsule(860, 520, 862, 680, 52, body)}
     <path d="M844 580 C860 588 878 588 894 580" fill="none" stroke="${bodyShade}" stroke-width="4"/>
     ${joint(862, 680, 24, body, p.indigo)}`,
  )}
  ${part(
    "nearFrontLower",
    `${capsule(862, 680, 866, 824, 36, body)}
     <path d="M850 744 C864 750 878 750 888 744" fill="none" stroke="${p.indigo}" stroke-width="6"/>
     ${joint(866, 824, 19, body, p.indigo)}`,
  )}
  ${part(
    "nearFrontHoof",
    `<path d="M846 816 C846 854 860 894 884 894 C902 894 906 854 900 816 Z" fill="${hoof}" stroke="${OUTLINE}" stroke-width="7"/>
     <path d="M854 870 C870 876 888 876 898 870" fill="none" stroke="${p.gold}" stroke-width="4"/>`,
  )}

  ${part(
    "nearHindUpper",
    `${capsule(520, 520, 514, 680, 56, body)}
     <path d="M494 584 C512 594 532 594 548 584" fill="none" stroke="${bodyShade}" stroke-width="4"/>
     ${joint(514, 680, 25, body, p.indigo)}`,
  )}
  ${part(
    "nearHindLower",
    `${capsule(514, 680, 516, 824, 38, body)}
     <path d="M498 744 C514 752 532 752 544 744" fill="none" stroke="${p.indigo}" stroke-width="6"/>
     ${joint(516, 824, 20, body, p.indigo)}`,
  )}
  ${part(
    "nearHindHoof",
    `<path d="M496 816 C496 854 512 894 536 894 C554 894 558 854 552 816 Z" fill="${hoof}" stroke="${OUTLINE}" stroke-width="7"/>
     <path d="M506 870 C522 876 540 876 550 870" fill="none" stroke="${p.gold}" stroke-width="4"/>`,
  )}

  ${part(
    "harnessAnchor",
    `<circle cx="930" cy="452" r="2" fill="none"/>
     <circle cx="930" cy="452" r="13" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="4"/>
     <path d="M930 465 L930 486" stroke="${p.gold}" stroke-width="6"/>`,
  )}
</svg>`;
}

function cartSvg() {
  const p = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="800" viewBox="0 0 1300 800">
  <defs>
    <pattern id="cartDiamonds" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M0 18 L18 0 L36 18 L18 36 Z" fill="none" stroke="${p.gold}" stroke-width="2.5" opacity="0.8"/>
    </pattern>
    <pattern id="cartStripes" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="9" height="18" fill="${p.cream}" opacity="0.35"/>
    </pattern>
  </defs>

  ${part(
    "farWheel",
    `<circle cx="580" cy="600" r="118" fill="${p.ochreDark}" stroke="${OUTLINE}" stroke-width="9"/>
     <circle cx="580" cy="600" r="98" fill="none" stroke="${p.indigo}" stroke-width="9"/>
     <circle cx="580" cy="600" r="24" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="6"/>
     ${Array.from({ length: 12 }, (_, index) => {
       const angle = (index / 12) * Math.PI * 2;
       const x1 = 580 + Math.cos(angle) * 24;
       const y1 = 600 + Math.sin(angle) * 24;
       const x2 = 580 + Math.cos(angle) * 98;
       const y2 = 600 + Math.sin(angle) * 98;
       return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${p.outline}" stroke-width="7"/>`;
     }).join("")}
     <circle cx="580" cy="600" r="8" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="3"/>`,
  )}

  ${part(
    "shafts",
    `<path d="M610 382 C760 366 1040 352 1280 350 L1280 388 C1040 390 760 408 622 426 Z" fill="${p.ochreDark}" stroke="${OUTLINE}" stroke-width="9"/>
     <path d="M610 466 C760 458 1040 448 1280 442 L1280 480 C1040 486 760 498 622 510 Z" fill="${p.ochreDark}" stroke="${OUTLINE}" stroke-width="9"/>
     <path d="M1180 350 L1180 480" stroke="${p.indigo}" stroke-width="10"/>
     <circle cx="1180" cy="415" r="12" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="4"/>`,
  )}

  ${part(
    "cartBody",
    `<path d="M106 292 C162 266 478 250 614 282 L636 462 C524 500 224 506 98 462 Z" fill="${p.ochre}" stroke="${OUTLINE}" stroke-width="10" stroke-linejoin="round"/>
     <path d="M120 330 C234 306 482 296 606 322 L618 424 C502 454 244 460 114 428 Z" fill="url(#cartDiamonds)" opacity="0.55"/>
     <path d="M114 360 C242 338 486 330 612 350" fill="none" stroke="${p.terracotta}" stroke-width="12"/>
     <path d="M126 444 C250 474 496 470 622 438" fill="none" stroke="${p.indigo}" stroke-width="14"/>
     <path d="M146 292 C158 222 248 186 354 184 C462 182 562 214 584 280 C536 260 448 246 360 248 C272 250 192 264 146 292 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="10" stroke-linejoin="round"/>
     <path d="M160 276 C236 248 462 238 568 272" fill="none" stroke="${p.gold}" stroke-width="7"/>
     <path d="M180 244 C252 222 450 214 542 240" fill="none" stroke="${p.cream}" stroke-width="4" stroke-dasharray="10 10" opacity="0.8"/>
     <path d="M142 300 C152 328 154 352 146 378 M160 292 C172 330 174 360 166 392 M178 288 C188 330 190 364 182 400" stroke="${p.gold}" stroke-width="5" stroke-linecap="round"/>
     <path d="M580 292 C570 330 568 360 576 394 M596 296 C586 334 584 362 592 396" stroke="${p.gold}" stroke-width="5" stroke-linecap="round"/>
     <circle cx="354" cy="382" r="26" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="6"/>
     <path d="M354 360 L370 382 L354 404 L338 382 Z" fill="${p.gold}" opacity="0.9"/>`,
  )}

  ${part(
    "nearWheel",
    `<circle cx="250" cy="590" r="126" fill="${p.ochre}" stroke="${OUTLINE}" stroke-width="10"/>
     <circle cx="250" cy="590" r="103" fill="none" stroke="${p.terracotta}" stroke-width="10"/>
     <circle cx="250" cy="590" r="90" fill="url(#cartStripes)" opacity="0.4"/>
     <circle cx="250" cy="590" r="26" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="6"/>
     ${Array.from({ length: 12 }, (_, index) => {
       const angle = (index / 12) * Math.PI * 2;
       const x1 = 250 + Math.cos(angle) * 26;
       const y1 = 590 + Math.sin(angle) * 26;
       const x2 = 250 + Math.cos(angle) * 103;
       const y2 = 590 + Math.sin(angle) * 103;
       return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${p.outline}" stroke-width="8"/>`;
     }).join("")}
     <circle cx="250" cy="590" r="9" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="3"/>`,
  )}
</svg>`;
}

function bellSvg() {
  const p = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="230" viewBox="0 0 180 230">
  ${part(
    "bell",
    `<path d="M90 16 C76 16 68 28 68 42 L68 54 C52 64 42 82 42 102 L42 150 C42 164 52 174 66 174 L114 174 C128 174 138 164 138 150 L138 102 C138 82 128 64 112 54 L112 42 C112 28 104 16 90 16 Z" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="8"/>
     <path d="M68 72 C78 64 102 64 112 72" fill="none" stroke="${p.goldDark}" stroke-width="6"/>
     <path d="M54 108 C76 120 104 120 126 108" fill="none" stroke="${p.terracotta}" stroke-width="8"/>
     <path d="M48 140 C76 152 104 152 132 140" fill="none" stroke="${p.terracotta}" stroke-width="8"/>
     <path d="M78 52 C84 46 96 46 102 52" fill="none" stroke="${p.cream}" stroke-width="4"/>
     <circle cx="90" cy="86" r="10" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="4"/>
     <path d="M90 174 L90 194" stroke="${OUTLINE}" stroke-width="8"/>
     <circle cx="90" cy="204" r="14" fill="${p.goldDark}" stroke="${OUTLINE}" stroke-width="6"/>
     <circle cx="90" cy="204" r="5" fill="${p.cream}"/>
     <path d="M68 28 C62 34 60 42 60 50" fill="none" stroke="${p.cream}" stroke-width="5" opacity="0.7"/>`,
  )}
</svg>`;
}

function courtyardSvg() {
  const p = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2600" height="1500" viewBox="0 0 2600 1500">
  <defs>
    <linearGradient id="courtyardSkyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f9e8bf"/>
      <stop offset="0.55" stop-color="#f0cf95"/>
      <stop offset="1" stop-color="#dfae6e"/>
    </linearGradient>
    <radialGradient id="courtyardSunGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff4c9" stop-opacity="0.95"/>
      <stop offset="0.4" stop-color="#ffd98d" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#ffd98d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="courtyardFloorGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9b176"/>
      <stop offset="1" stop-color="#c08d53"/>
    </linearGradient>
    <pattern id="courtyardJaali" width="46" height="46" patternUnits="userSpaceOnUse">
      <path d="M23 2 L44 23 L23 44 L2 23 Z" fill="none" stroke="${p.cream}" stroke-width="2.2" opacity="0.75"/>
      <circle cx="23" cy="23" r="5" fill="${p.cream}" opacity="0.65"/>
    </pattern>
    <pattern id="courtyardBand" width="40" height="22" patternUnits="userSpaceOnUse">
      <path d="M0 18 L10 4 L20 18 L30 4 L40 18" fill="none" stroke="${p.terracotta}" stroke-width="3"/>
    </pattern>
    <pattern id="courtyardFloorTiles" width="150" height="150" patternUnits="userSpaceOnUse">
      <rect width="150" height="150" fill="none" stroke="${p.ochreDark}" stroke-width="2" opacity="0.25"/>
      <path d="M0 75 L150 75 M75 0 L75 150" stroke="${p.ochreDark}" stroke-width="1" opacity="0.16"/>
    </pattern>
  </defs>

  <g data-layer="sky">
    <rect width="2600" height="1500" fill="url(#courtyardSkyGrad)"/>
    <circle cx="2000" cy="290" r="520" fill="url(#courtyardSunGlow)"/>
    <circle cx="2000" cy="290" r="112" fill="#fff0bd" stroke="${p.goldDark}" stroke-width="5" opacity="0.9"/>
    <path d="M1680 250 C1730 210 1800 210 1850 250 M1830 190 C1870 160 1920 160 1960 190" fill="none" stroke="${p.cream}" stroke-width="5" opacity="0.55" stroke-linecap="round"/>
    <path d="M420 260 C460 230 510 230 550 260 M560 320 C590 298 628 298 658 320" fill="none" stroke="${p.cream}" stroke-width="4" opacity="0.4" stroke-linecap="round"/>
    <path d="M0 760 C360 700 700 720 1040 780 C1400 844 1780 830 2600 730 L2600 1500 L0 1500 Z" fill="#e9c58b" opacity="0.32"/>
  </g>

  <g data-layer="distant">
    <path d="M0 880 C260 800 480 820 720 870 C960 920 1180 900 1420 840 C1700 770 2010 790 2600 900 L2600 1120 L0 1120 Z" fill="#c79a64" opacity="0.75"/>
    <path d="M120 820 L120 740 C120 700 150 680 190 680 C230 680 260 700 260 740 L260 820 Z" fill="#b98556"/>
    <path d="M300 840 L300 760 C300 726 326 708 360 708 C394 708 420 726 420 760 L420 840 Z" fill="#b98556"/>
    <path d="M520 860 L520 780 C520 746 546 728 580 728 C614 728 640 746 640 780 L640 860 Z" fill="#b98556"/>
    <path d="M2060 840 L2060 760 C2060 726 2086 708 2120 708 C2154 708 2180 726 2180 760 L2180 840 Z" fill="#b98556"/>
    <path d="M2240 820 L2240 740 C2240 706 2266 688 2300 688 C2334 688 2360 706 2360 740 L2360 820 Z" fill="#b98556"/>
    <path d="M60 900 C180 860 280 860 400 900 M2100 900 C2220 860 2340 860 2480 900" fill="none" stroke="#a9784f" stroke-width="8" opacity="0.5"/>
    <path d="M640 880 C700 840 760 840 820 880 L820 920 L640 920 Z" fill="#7d8b5d" opacity="0.7"/>
    <path d="M1880 870 C1940 830 2000 830 2060 870 L2060 910 L1880 910 Z" fill="#7d8b5d" opacity="0.6"/>
  </g>

  <g data-layer="main">
    <path d="M260 1010 L2340 1010 L2400 1100 L200 1100 Z" fill="${p.ochreDark}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M300 980 L2300 980 L2300 1030 L300 1030 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="7"/>
    <path d="M410 420 L2190 420 L2190 990 L410 990 Z" fill="#d9aa6d" stroke="${OUTLINE}" stroke-width="10"/>
    <path d="M410 420 L2190 420 L2190 470 L410 470 Z" fill="url(#courtyardBand)" opacity="0.85"/>
    <path d="M420 480 L2180 480" stroke="${p.terracotta}" stroke-width="10"/>
    <path d="M420 940 L2180 940" stroke="${p.terracotta}" stroke-width="14"/>
    <path d="M420 940 L2180 940" stroke="${p.gold}" stroke-width="4" stroke-dasharray="18 14"/>

    <path d="M1030 990 L1030 640 C1030 520 1120 460 1300 460 C1480 460 1570 520 1570 640 L1570 990 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="12"/>
    <path d="M1075 990 L1075 650 C1075 550 1150 505 1300 505 C1450 505 1525 550 1525 650 L1525 990 Z" fill="#20364d" stroke="${p.gold}" stroke-width="6"/>
    <path d="M1300 505 L1300 990" stroke="${p.indigoLight}" stroke-width="4" opacity="0.5"/>
    <path d="M1110 700 C1150 680 1200 680 1240 700 M1360 700 C1400 680 1450 680 1490 700" fill="none" stroke="${p.gold}" stroke-width="6"/>
    <path d="M1110 820 C1150 800 1200 800 1240 820 M1360 820 C1400 800 1450 800 1490 820" fill="none" stroke="${p.gold}" stroke-width="5"/>
    <path d="M1060 990 L1540 990 L1540 1040 L1060 1040 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="7"/>
    <path d="M1020 1040 L1580 1040 L1580 1080 L1020 1080 Z" fill="${p.creamShade}" stroke="${OUTLINE}" stroke-width="7"/>
    <circle cx="1300" cy="660" r="16" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="4"/>

    ${[520, 690, 860, 1740, 1910, 2080]
      .map(
        (
          x,
          index,
        ) => `<path d="M${x} 900 L${x} 700 C${x} 640 ${x + 40} 610 ${x + 78} 610 C${x + 116} 610 ${x + 156} 640 ${x + 156} 700 L${x + 156} 900 Z" fill="${index % 2 === 0 ? p.terracotta : p.indigo}" stroke="${OUTLINE}" stroke-width="8"/>
        <path d="M${x + 14} 890 L${x + 14} 706 C${x + 14} 658 ${x + 44} 632 ${x + 78} 632 C${x + 112} 632 ${x + 142} 658 ${x + 142} 706 L${x + 142} 890 Z" fill="url(#courtyardJaali)" opacity="0.9"/>
        <path d="M${x - 16} 900 L${x + 172} 900" stroke="${p.gold}" stroke-width="6"/>`,
      )
      .join("")}

    <path d="M560 560 L860 560 L860 700 L560 700 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="9"/>
    <path d="M580 580 L840 580 L840 680 L580 680 Z" fill="url(#courtyardJaali)" opacity="0.85"/>
    <path d="M540 700 L880 700 L900 730 L520 730 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M1720 560 L2020 560 L2020 700 L1720 700 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="9"/>
    <path d="M1740 580 L2000 580 L2000 680 L1740 680 Z" fill="url(#courtyardJaali)" opacity="0.85"/>
    <path d="M1700 700 L2040 700 L2060 730 L1680 730 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="8"/>

    <path d="M700 420 L700 330 C700 300 736 280 776 280 C816 280 852 300 852 330 L852 420 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M1748 420 L1748 330 C1748 300 1784 280 1824 280 C1864 280 1900 300 1900 330 L1900 420 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M688 420 L864 420 L864 446 L688 446 Z" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="6"/>
    <path d="M1736 420 L1912 420 L1912 446 L1736 446 Z" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="6"/>
    <path d="M760 300 C760 272 776 254 794 254 C812 254 828 272 828 300" fill="none" stroke="${p.cream}" stroke-width="4" opacity="0.8"/>
    <path d="M1808 300 C1808 272 1824 254 1842 254 C1860 254 1876 272 1876 300" fill="none" stroke="${p.cream}" stroke-width="4" opacity="0.8"/>

    <path d="M900 470 C900 440 930 420 960 420 L960 640 L900 640 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="7"/>
    <path d="M1640 420 C1670 420 1700 440 1700 470 L1700 640 L1640 640 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="7"/>
    <path d="M920 500 L920 620 M1660 500 L1660 620" stroke="${p.terracotta}" stroke-width="5"/>

    <path d="M940 500 C940 470 970 450 1000 450 L1000 610 L940 610 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="7"/>
    <path d="M1600 500 C1600 470 1630 450 1660 450 L1660 610 L1600 610 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="7"/>
    <path d="M950 530 L990 530 M950 560 L990 560 M1610 530 L1650 530 M1610 560 L1650 560" stroke="${p.gold}" stroke-width="4"/>

    <path d="M2280 1030 C2250 900 2260 760 2300 620 L2360 630 C2330 780 2330 900 2360 1030 Z" fill="#6d4a2d" stroke="${OUTLINE}" stroke-width="10"/>
    <path d="M2290 700 C2230 660 2190 620 2170 570 M2320 650 C2380 610 2420 570 2440 520 M2310 780 C2250 760 2200 730 2160 690" fill="none" stroke="#6d4a2d" stroke-width="16" stroke-linecap="round"/>
    <circle cx="2240" cy="560" r="90" fill="#77855a" stroke="${OUTLINE}" stroke-width="6"/>
    <circle cx="2350" cy="500" r="110" fill="#68784f" stroke="${OUTLINE}" stroke-width="6"/>
    <circle cx="2460" cy="590" r="95" fill="#7d8b5d" stroke="${OUTLINE}" stroke-width="6"/>
    <circle cx="2180" cy="660" r="70" fill="#68784f" stroke="${OUTLINE}" stroke-width="5"/>
    <circle cx="2400" cy="690" r="78" fill="#77855a" stroke="${OUTLINE}" stroke-width="5"/>
    <path d="M2210 540 C2240 520 2270 530 2290 550 M2320 480 C2360 456 2400 470 2420 500 M2430 570 C2460 550 2490 560 2500 590" fill="none" stroke="${p.cream}" stroke-width="4" opacity="0.55"/>

    <path d="M480 600 L530 600 L520 700 L490 700 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="5"/>
    <path d="M470 700 C480 674 530 674 540 700" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="5"/>
    <path d="M500 620 L500 684" stroke="${p.gold}" stroke-width="3" stroke-dasharray="5 7"/>

    <path d="M1040 530 C1080 560 1120 566 1160 550 L1160 620 C1120 636 1080 630 1040 600 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="6"/>
    <path d="M1060 550 C1090 572 1120 576 1148 562" fill="none" stroke="${p.gold}" stroke-width="4" stroke-dasharray="8 7"/>
    <path d="M1660 540 C1700 570 1740 576 1780 560 L1780 630 C1740 646 1700 640 1660 610 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="6"/>
    <path d="M1680 560 C1710 582 1740 586 1768 572" fill="none" stroke="${p.gold}" stroke-width="4" stroke-dasharray="8 7"/>
  </g>

  <g data-layer="foreground">
    <path d="M0 1080 L2600 1080 L2600 1500 L0 1500 Z" fill="url(#courtyardFloorGrad)"/>
    <rect x="0" y="1080" width="2600" height="420" fill="url(#courtyardFloorTiles)"/>
    <path d="M260 1080 L260 1500 M520 1080 L520 1500 M780 1080 L780 1500 M1040 1080 L1040 1500 M1300 1080 L1300 1500 M1560 1080 L1560 1500 M1820 1080 L1820 1500 M2080 1080 L2080 1500 M2340 1080 L2340 1500" stroke="${p.ochreDark}" stroke-width="2" opacity="0.22"/>
    <path d="M0 1240 L2600 1240 M0 1390 L2600 1390" stroke="${p.ochreDark}" stroke-width="2" opacity="0.18"/>
    <path d="M0 1080 L2600 1080" stroke="${OUTLINE}" stroke-width="10"/>

    <ellipse cx="1240" cy="1370" rx="300" ry="120" fill="#b87b49" opacity="0.18"/>
    <circle cx="1240" cy="1370" r="190" fill="none" stroke="${p.cream}" stroke-width="8" opacity="0.75"/>
    <circle cx="1240" cy="1370" r="150" fill="none" stroke="${p.terracotta}" stroke-width="6" opacity="0.65"/>
    <circle cx="1240" cy="1370" r="110" fill="none" stroke="${p.gold}" stroke-width="5" opacity="0.65"/>
    ${Array.from({ length: 16 }, (_, index) => {
      const angle = (index / 16) * Math.PI * 2;
      const x1 = 1240 + Math.cos(angle) * 112;
      const y1 = 1370 + Math.sin(angle) * 112;
      const x2 = 1240 + Math.cos(angle) * 182;
      const y2 = 1370 + Math.sin(angle) * 182;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${p.terracotta}" stroke-width="2.5" opacity="0.45"/>`;
    }).join("")}

    <path d="M150 1180 C130 1110 146 1050 190 1010 C230 974 292 982 318 1026 C344 1072 324 1140 276 1180 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="9"/>
    <path d="M190 1040 C216 1080 220 1130 204 1174" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="10 10"/>
    <path d="M250 1035 C230 1080 230 1136 252 1178" fill="none" stroke="${p.indigo}" stroke-width="4"/>
    <path d="M160 1110 C174 1114 186 1114 198 1110" stroke="${p.gold}" stroke-width="6"/>

    <path d="M2340 1180 C2310 1100 2330 1040 2380 1010 C2420 986 2470 1000 2490 1046 C2510 1092 2480 1150 2440 1180 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="9"/>
    <path d="M2388 1020 C2410 1060 2414 1110 2398 1150" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="9 9"/>
    <path d="M2440 1030 C2460 1070 2462 1120 2448 1160" fill="none" stroke="${p.cream}" stroke-width="4" opacity="0.7"/>
    <path d="M2280 1150 C2240 1090 2250 1020 2300 980 C2340 950 2380 960 2390 1000 C2360 1010 2340 1040 2338 1070" fill="#77855a" stroke="${OUTLINE}" stroke-width="7"/>
    <path d="M2500 1120 C2540 1080 2580 1080 2600 1100 L2600 1500 L2500 1500 Z" fill="#77855a" opacity="0.5"/>

    <path d="M0 1450 C200 1410 420 1420 620 1470 L620 1500 L0 1500 Z" fill="${p.ochreDark}" opacity="0.22"/>
    <path d="M1980 1460 C2180 1420 2400 1420 2600 1460 L2600 1500 L1980 1500 Z" fill="${p.ochreDark}" opacity="0.22"/>
  </g>
</svg>`;
}

function streetSvg() {
  const p = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2600" height="1500" viewBox="0 0 2600 1500">
  <defs>
    <linearGradient id="streetSkyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f8e5bb"/>
      <stop offset="0.7" stop-color="#edc88c"/>
      <stop offset="1" stop-color="#d9a669"/>
    </linearGradient>
    <pattern id="streetJaali" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M21 2 L40 21 L21 40 L2 21 Z" fill="none" stroke="${p.cream}" stroke-width="2" opacity="0.7"/>
    </pattern>
    <pattern id="streetCobbles" width="130" height="100" patternUnits="userSpaceOnUse">
      <path d="M0 50 C30 30 60 30 90 50 C110 64 128 62 130 58 M40 0 C46 22 44 38 36 50 M100 52 C108 72 106 90 98 100" fill="none" stroke="${p.ochreDark}" stroke-width="3" opacity="0.22"/>
    </pattern>
  </defs>

  <g data-layer="sky">
    <rect width="2600" height="1500" fill="url(#streetSkyGrad)"/>
    <circle cx="1300" cy="260" r="420" fill="#ffe9ae" opacity="0.35"/>
    <circle cx="1300" cy="260" r="80" fill="#fff1c4" opacity="0.85"/>
    <path d="M300 250 C350 210 420 210 470 250 M500 180 C540 150 590 150 630 180" fill="none" stroke="${p.cream}" stroke-width="4" opacity="0.5"/>
    <path d="M0 820 C420 760 780 780 1200 840 C1600 896 2000 870 2600 780 L2600 1500 L0 1500 Z" fill="#e7c18a" opacity="0.25"/>
  </g>

  <g data-layer="distant">
    <path d="M980 1030 L980 700 C980 590 1080 520 1300 520 C1520 520 1620 590 1620 700 L1620 1030 Z" fill="#b98655" stroke="${OUTLINE}" stroke-width="10"/>
    <path d="M1030 1030 L1030 710 C1030 620 1110 565 1300 565 C1490 565 1570 620 1570 710 L1570 1030 Z" fill="#8c5c3f" stroke="${p.gold}" stroke-width="6"/>
    <path d="M1300 565 L1300 1030" stroke="${p.terracotta}" stroke-width="5" opacity="0.5"/>
    <path d="M1050 760 C1100 730 1160 730 1210 760 M1390 760 C1440 730 1500 730 1550 760" fill="none" stroke="${p.gold}" stroke-width="5"/>
    <path d="M1080 880 C1130 850 1190 850 1240 880 M1360 880 C1410 850 1470 850 1520 880" fill="none" stroke="${p.gold}" stroke-width="4"/>
    <path d="M820 900 L820 780 C820 730 860 700 910 700 C960 700 1000 730 1000 780 L1000 900 Z" fill="#c79a64" opacity="0.8"/>
    <path d="M1600 900 L1600 780 C1600 730 1640 700 1690 700 C1740 700 1780 730 1780 780 L1780 900 Z" fill="#c79a64" opacity="0.8"/>
  </g>

  <g data-layer="main">
    <path d="M0 470 L720 430 L780 1080 L0 1120 Z" fill="#d2a164" stroke="${OUTLINE}" stroke-width="10"/>
    <path d="M1880 430 L2600 470 L2600 1120 L1820 1080 Z" fill="#cf9b60" stroke="${OUTLINE}" stroke-width="10"/>
    <path d="M60 520 L620 492 L660 1010 L40 1040 Z" fill="#dbb477" stroke="${OUTLINE}" stroke-width="7"/>
    <path d="M1980 492 L2540 520 L2560 1040 L1940 1010 Z" fill="#d9ae71" stroke="${OUTLINE}" stroke-width="7"/>

    ${[80, 240, 400, 560]
      .map(
        (
          x,
          index,
        ) => `<path d="M${x} 980 L${x} 700 C${x} 660 ${x + 24} 636 ${x + 60} 636 C${x + 96} 636 ${x + 120} 660 ${x + 120} 700 L${x + 120} 980 Z" fill="${index % 2 === 0 ? p.terracotta : p.indigo}" stroke="${OUTLINE}" stroke-width="7"/>
        <path d="M${x + 12} 960 L${x + 12} 708 C${x + 12} 678 ${x + 32} 658 ${x + 60} 658 C${x + 88} 658 ${x + 108} 678 ${x + 108} 708 L${x + 108} 960 Z" fill="url(#streetJaali)" opacity="0.8"/>`,
      )
      .join("")}
    ${[2020, 2180, 2340, 2500]
      .map(
        (
          x,
          index,
        ) => `<path d="M${x} 980 L${x} 700 C${x} 660 ${x + 24} 636 ${x + 60} 636 C${x + 96} 636 ${x + 120} 660 ${x + 120} 700 L${x + 120} 980 Z" fill="${index % 2 === 0 ? p.indigo : p.terracotta}" stroke="${OUTLINE}" stroke-width="7"/>
        <path d="M${x + 12} 960 L${x + 12} 708 C${x + 12} 678 ${x + 32} 658 ${x + 60} 658 C${x + 88} 658 ${x + 108} 678 ${x + 108} 708 L${x + 108} 960 Z" fill="url(#streetJaali)" opacity="0.8"/>`,
      )
      .join("")}

    <path d="M780 440 L1300 400 L1300 470 L780 500 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M1300 400 L1820 440 L1820 500 L1300 470 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M820 470 C900 500 980 510 1060 500 L1060 620 C970 632 890 620 820 586 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="6"/>
    <path d="M840 500 C900 524 980 532 1040 522" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="9 8"/>
    <path d="M1540 500 C1620 510 1700 500 1780 470 L1780 586 C1700 620 1620 632 1540 620 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="6"/>
    <path d="M1560 522 C1620 532 1700 524 1760 500" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="9 8"/>

    <path d="M760 460 C760 420 790 396 830 396 L830 620 L760 620 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="7"/>
    <path d="M1770 396 C1810 396 1840 420 1840 460 L1840 620 L1770 620 Z" fill="${p.cream}" stroke="${OUTLINE}" stroke-width="7"/>
    <path d="M780 480 L780 600 M1800 480 L1800 600" stroke="${p.terracotta}" stroke-width="4"/>

    <path d="M500 480 L500 360 C500 320 540 292 590 292 C640 292 680 320 680 360 L680 480 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M1920 480 L1920 360 C1920 320 1960 292 2010 292 C2060 292 2100 320 2100 360 L2100 480 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M480 480 L700 480 L700 508 L480 508 Z" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="6"/>
    <path d="M1900 480 L2120 480 L2120 508 L1900 508 Z" fill="${p.gold}" stroke="${OUTLINE}" stroke-width="6"/>

    <path d="M880 440 C880 400 900 376 924 376 L924 500 L880 500 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="6"/>
    <path d="M1676 376 C1700 376 1720 400 1720 440 L1720 500 L1676 500 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="6"/>

    <path d="M0 1120 L760 1080 L760 1160 L0 1200 Z" fill="${p.ochreDark}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M1840 1080 L2600 1120 L2600 1200 L1840 1160 Z" fill="${p.ochreDark}" stroke="${OUTLINE}" stroke-width="8"/>

    <path d="M340 560 C300 540 280 500 290 460" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="10 8"/>
    <path d="M2260 560 C2300 540 2320 500 2310 460" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="10 8"/>
    <circle cx="340" cy="548" r="12" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="2260" cy="548" r="12" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="4"/>
  </g>

  <g data-layer="foreground">
    <path d="M0 1120 L2600 1120 L2600 1500 L0 1500 Z" fill="${p.ochreDark}"/>
    <path d="M0 1120 L2600 1120 L2600 1500 L0 1500 Z" fill="url(#streetCobbles)" opacity="0.55"/>
    <path d="M0 1160 C420 1120 780 1120 1100 1160 C1500 1208 2000 1200 2600 1140 L2600 1200 C2000 1260 1500 1268 1100 1220 C780 1180 420 1180 0 1220 Z" fill="${p.gold}" opacity="0.18"/>
    <path d="M0 1120 L2600 1120" stroke="${OUTLINE}" stroke-width="8"/>

    <path d="M160 1290 C130 1210 150 1140 205 1100 C255 1064 320 1080 340 1132 C360 1184 330 1260 280 1290 Z" fill="${p.terracotta}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M210 1120 C236 1160 238 1210 220 1260" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="10 9"/>
    <path d="M2380 1290 C2350 1210 2370 1140 2420 1100 C2470 1064 2530 1080 2550 1132 C2570 1184 2540 1260 2490 1290 Z" fill="${p.indigo}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M2428 1120 C2454 1160 2456 1210 2438 1260" fill="none" stroke="${p.gold}" stroke-width="5" stroke-dasharray="10 9"/>

    <path d="M500 1160 C470 1120 480 1070 520 1040 C550 1018 590 1024 600 1056 C608 1082 588 1112 566 1132" fill="#77855a" stroke="${OUTLINE}" stroke-width="6"/>
    <path d="M2120 1160 C2090 1120 2100 1070 2140 1040 C2170 1018 2210 1024 2220 1056 C2228 1082 2208 1112 2186 1132" fill="#77855a" stroke="${OUTLINE}" stroke-width="6"/>

    <path d="M0 1450 C260 1410 520 1420 780 1460 L780 1500 L0 1500 Z" fill="${p.ochreDark}" opacity="0.3"/>
    <path d="M1820 1460 C2080 1420 2340 1410 2600 1450 L2600 1500 L1820 1500 Z" fill="${p.ochreDark}" opacity="0.3"/>
  </g>
</svg>`;
}

async function renderBackground(page, name, svg, width = 2600, height = 1500) {
  await page.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`,
    { waitUntil: "load" },
  );
  await page.setViewportSize({ width, height });
  const masterPath = join(MASTER_PNG_DIR, `${name}.png`);
  mkdirSync(MASTER_PNG_DIR, { recursive: true });
  await page.locator("svg").screenshot({ path: masterPath, omitBackground: true });

  const layers = await page.evaluate(() => {
    const svg = document.querySelector("svg");
    if (!svg) throw new Error("Background SVG missing.");
    return [...svg.querySelectorAll("g[data-layer]")].map((layer) => {
      const id = layer.getAttribute("data-layer");
      if (!id) throw new Error("Background layer missing data-layer.");
      const clone = svg.cloneNode(true);
      for (const candidate of [...clone.querySelectorAll("g[data-layer]")]) {
        if (candidate.getAttribute("data-layer") !== id) candidate.remove();
      }
      clone.setAttribute("viewBox", "0 0 2600 1500");
      clone.setAttribute("width", "2600");
      clone.setAttribute("height", "1500");
      return { id, svg: clone.outerHTML };
    });
  });

  const depth = { sky: 0.8, distant: 0.86, main: 0.93, foreground: 1 };
  const manifestLayers = [];
  for (const layer of layers) {
    await page.setViewportSize({ width, height });
    await page.setContent(
      `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${layer.svg}</body></html>`,
      { waitUntil: "load" },
    );
    const file = `backgrounds/${name}-${layer.id}.png`;
    const layerPath = join(PUBLIC_DIR, file);
    mkdirSync(dirname(layerPath), { recursive: true });
    await page.locator("svg").screenshot({ path: layerPath, omitBackground: true });
    const buffer = readFileSync(layerPath);
    manifestLayers.push({
      id: layer.id,
      file,
      depth: depth[layer.id] ?? 1,
      opacity: 1,
      width,
      height,
      sha256: hash(buffer),
      bytes: buffer.length,
      origin: "original-vector-authored",
      provider: "fableon-local-vector",
      reviewStatus: "pending_artistic_approval",
    });
  }

  return {
    masterPng: `masters/${name}.png`,
    masterPngSha256: hash(readFileSync(masterPath)),
    masterSvg: relative(ROOT, join(MASTER_DIR, `${name}.svg`)),
    width,
    height,
    layers: manifestLayers,
  };
}

function writeMaster(name, svg) {
  mkdirSync(MASTER_DIR, { recursive: true });
  const file = join(MASTER_DIR, `${name}.svg`);
  writeFileSync(file, `${svg}\n`, "utf8");
  return { file, svg };
}

async function renderMasterAndParts(page, name, svg, options = {}) {
  await page.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`,
    { waitUntil: "load" },
  );
  const width = options.width ?? 900;
  const height = options.height ?? 1100;
  const masterPath = join(MASTER_PNG_DIR, `${name}.png`);
  mkdirSync(MASTER_PNG_DIR, { recursive: true });
  await page.setViewportSize({ width, height });
  await page.evaluate(() => {
    for (const group of document.querySelectorAll('[data-variant="alternate"]')) {
      group.style.display = "none";
    }
  });
  await page.locator("svg").screenshot({ path: masterPath, omitBackground: true });
  await page.evaluate(() => {
    for (const group of document.querySelectorAll('[data-variant="alternate"]')) {
      group.style.display = "";
    }
  });

  const parts = await page.evaluate(() => {
    const svg = document.querySelector("svg");
    if (!svg) throw new Error("Master SVG missing.");
    const groups = [...svg.querySelectorAll("g[data-part]")];
    return groups.map((group) => {
      const id = group.getAttribute("data-part");
      if (!id) throw new Error("Part group missing data-part.");
      const box = group.getBBox();
      const padding = 24;
      const clipX = Math.floor(box.x - padding);
      const clipY = Math.floor(box.y - padding);
      const clipWidth = Math.ceil(box.width + padding * 2);
      const clipHeight = Math.ceil(box.height + padding * 2);
      const clone = svg.cloneNode(true);
      for (const candidate of [...clone.querySelectorAll("g[data-part]")]) {
        if (candidate.getAttribute("data-part") !== id) candidate.remove();
      }
      const target = clone.querySelector(`g[data-part="${id}"]`);
      if (!target) throw new Error(`Part ${id} missing.`);
      clone.setAttribute("viewBox", `${clipX} ${clipY} ${clipWidth} ${clipHeight}`);
      clone.setAttribute("width", String(clipWidth));
      clone.setAttribute("height", String(clipHeight));
      return {
        id,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        clipX,
        clipY,
        clipWidth,
        clipHeight,
        svg: clone.outerHTML,
      };
    });
  });

  const manifestParts = [];
  for (const box of parts) {
    await page.setViewportSize({ width: box.clipWidth, height: box.clipHeight });
    await page.setContent(
      `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${box.svg}</body></html>`,
      { waitUntil: "load" },
    );
    const partPath = join(PART_DIR, name, `${box.id}.png`);
    mkdirSync(dirname(partPath), { recursive: true });
    await page.locator("svg").screenshot({ path: partPath, omitBackground: true });
    const buffer = readFileSync(partPath);
    manifestParts.push({
      id: `${name}_${box.id}`,
      file: `parts/${name}/${box.id}.png`,
      offsetX: box.clipX,
      offsetY: box.clipY,
      width: box.clipWidth,
      height: box.clipHeight,
      sourceBox: {
        x: Number(box.x.toFixed(2)),
        y: Number(box.y.toFixed(2)),
        width: Number(box.width.toFixed(2)),
        height: Number(box.height.toFixed(2)),
      },
      sha256: hash(buffer),
      bytes: buffer.length,
      origin: "original-vector-authored",
      provider: "fableon-local-vector",
      model: "fableon-svg-v1",
      reviewStatus: "pending_artistic_approval",
    });
  }

  return {
    masterPng: `masters/${name}.png`,
    masterPngSha256: hash(readFileSync(masterPath)),
    masterSvg: relative(ROOT, join(MASTER_DIR, `${name}.svg`)),
    width,
    height,
    parts: manifestParts,
  };
}

async function main() {
  const startedAt = new Date();
  rmSync(PART_DIR, { recursive: true, force: true });
  rmSync(MASTER_PNG_DIR, { recursive: true, force: true });
  mkdirSync(PART_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  const artisan = writeMaster("artisan", artisanSvg());
  const horse = writeMaster("horse", horseSvg());
  const cart = writeMaster("cart", cartSvg());
  const bell = writeMaster("bell", bellSvg());
  const courtyard = writeMaster("courtyard", courtyardSvg());
  const street = writeMaster("street", streetSvg());
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
    const generatedArtisan = await renderMasterAndParts(page, "artisan", artisan.svg, {
      width: 900,
      height: 1100,
    });
    const generatedHorse = await renderMasterAndParts(page, "horse", horse.svg, {
      width: 1400,
      height: 950,
    });
    const generatedCart = await renderMasterAndParts(page, "cart", cart.svg, {
      width: 1300,
      height: 800,
    });
    const generatedBell = await renderMasterAndParts(page, "bell", bell.svg, {
      width: 180,
      height: 230,
    });
    const generatedCourtyard = await renderBackground(page, "courtyard", courtyard.svg);
    const generatedStreet = await renderBackground(page, "street", street.svg);

    const manifest = {
      format: "fableon.folk-asset-pack",
      version: 1,
      id: "folk-pilot-v1",
      title: "The Little Brass Bell",
      generatedAt: new Date().toISOString(),
      generationMode: "original-local-vector-art",
      aiGeneration: {
        status: "blocked",
        reason:
          "No NVIDIA/CUDA GPU or ComfyUI endpoint is available; remote image APIs are not authorized.",
        paidApiCalls: 0,
      },
      palette,
      characters: {
        artisan: generatedArtisan,
        horse: generatedHorse,
        cart: generatedCart,
        bell: generatedBell,
      },
      backgrounds: {
        courtyard: generatedCourtyard,
        street: generatedStreet,
      },
      parts: [
        ...generatedArtisan.parts,
        ...generatedHorse.parts,
        ...generatedCart.parts,
        ...generatedBell.parts,
      ],
    };
    writeFileSync(
      join(PUBLIC_DIR, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    const manifestBuffer = readFileSync(join(PUBLIC_DIR, "manifest.json"));
    appendCostEvent(
      ROOT,
      createCostEvent({
        operation: "asset-generation",
        assetId: "folk-pilot-v1",
        provider: "fableon-local-vector",
        model: "fableon-svg-v1",
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        status: "completed",
        attempt: 1,
        inputReferences: [
          "assets/folk-pilot/masters/artisan.svg",
          "assets/folk-pilot/masters/horse.svg",
          "assets/folk-pilot/masters/cart.svg",
          "assets/folk-pilot/masters/bell.svg",
          "assets/folk-pilot/masters/courtyard.svg",
          "assets/folk-pilot/masters/street.svg",
        ],
        outputHash: hash(manifestBuffer),
        outputCount: manifest.parts.length,
        runtimeMs: Date.now() - startedAt.getTime(),
        pricingSource: "local-no-charge",
        estimatedChargeUsd: 0,
        actualChargeUsd: null,
        billingReconciliation: "not_applicable_local",
        note: "Original vector masters authored locally; no image API was called. AI generation remains blocked.",
      }),
    );
    console.log(
      `Wrote ${generatedArtisan.parts.length} artisan, ${generatedHorse.parts.length} horse, ${generatedCart.parts.length} cart, and ${generatedBell.parts.length} bell parts.`,
    );
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
