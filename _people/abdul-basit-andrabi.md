---
name: "Abdul Basit Andrabi"
photo: /assets/img/people/abdul-basit-andrabi.jpg
role: "PhD Scholar, Electronics and Electrical Engineering"
category: current
order: 3
topic: "Device physics and simulation of defects and mobile ions in perovskite devices"
email: ""
areas: [trap-analysis-modelling, solar-cells]
highlights:
  - "A trap probe that needs only a dark current–voltage curve (Solar Energy, 2023)"
  - "Wrote his own drift–diffusion device simulator with traps and mobile ions"
  - "DLTS of ionic defects in flexible perovskite memristors"
description: "Abdul Basit Andrabi (IIT Guwahati) works on device physics and simulation of traps and mobile ions in halide perovskite devices, and has written his own drift–diffusion simulator."
figures:
  - src: "/assets/img/figures/transition-voltage-solen2023.jpg"
    caption: "Band diagram and J–V with its log-slope G–V; the peak marks the transition voltage. From A. B. Andrabi and A. T. Mallajosyula, Sol. Energy 264, 112020 (2023)."
  - src: "/assets/img/figures/transition-voltage-traps-solen2023.jpg"
    caption: "How trap density shifts the transition peak (TCAD). From A. B. Andrabi and A. T. Mallajosyula, Sol. Energy 264, 112020 (2023)."
  - src: "/assets/img/figures/dlts-memristor-ifetc2022.jpg"
    caption: "DLTS of ionic defects in a flexible perovskite memristor. From H. J. Gogoi, A. B. Andrabi et al., IEEE IFETC (2022)."
---

Basit works on the device physics of halide perovskite devices. His question is simple to state: what do ordinary electrical measurements, such as dark J–V, capacitance–frequency, impedance and current transients, actually tell us about the traps and mobile ions inside a perovskite film? He also asks when each reading can be trusted.

**A trap probe from a dark J–V curve.** In a perovskite diode, current changes from diffusion-limited to drift-limited at a transition voltage, which shows up as a peak in the logarithmic slope d(log J)/d(log V). Trapped charge near the injecting contact bends the bands and shifts this peak to lower voltage. Using Sentaurus TCAD, he showed that the shift tracks trap density and depth, survives in the presence of mobile ions and doping, and is a better trap indicator than V<sub>OC</sub> in complete solar cells. This work is published in *Solar Energy* (2023). His thesis turns it into a quantitative extraction method.

**Slow charge at the contact.** His thesis also studies how slow charge near the injecting contact, held either in interface traps or in mobile ions, changes the injection barrier. He looks at what this does to impedance and capacitance measurements, including the "negative capacitance" often reported in perovskite devices, and how trap and ionic effects can be told apart.

**His own simulator.** For this work he wrote a one-dimensional drift–diffusion device simulator. It treats trap occupancy and mobile-ion density as dynamical variables and solves DC, small-signal and transient problems in one framework. Because it exposes the internal variables of the device, individual physical couplings can be switched off one at a time, which commercial tools do not allow. He validated it against a commercial TCAD simulator.

He has also worked on DLTS of ionic defects in flexible perovskite memristors, and on lead-free perovskite tandem solar cells.

*Thesis (in preparation): Electrical characterisation of ionic and electronic defects in halide perovskite devices: a device-simulation study.*
