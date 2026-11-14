---
title: "Defect spectroscopy and device modelling"
short: "Device physics"
order: 5
figure: model
lead: "Physics-based ways to find traps and mobile ions in perovskite devices from electrical measurements, our own device simulator, and compact models of transistors and memories."
people: [abdul-basit-andrabi, abinash-baruah, rekib-uddin-ahmed]
methods: "Sentaurus and Silvaco TCAD · CEISIM (our in-house 1D drift–diffusion simulator) · DLTS · impedance and capacitance spectroscopy · low-temperature I–V and C–V · MATLAB"
description: "Trap and mobile-ion characterisation, DLTS, drift–diffusion device simulation and compact modelling at the Nanoelectronics and Semiconductor Devices Group, IIT Guwahati."
figures:
  - src: "/assets/img/figures/transition-voltage-solen2023.jpg"
    caption: "The transition voltage: where the slope of log J against log V peaks, current changes from diffusion to drift. From A. B. Andrabi and A. T. Mallajosyula, Sol. Energy 264, 112020 (2023)."
  - src: "/assets/img/figures/transition-voltage-traps-solen2023.jpg"
    caption: "TCAD: the transition peak moves and weakens as trap density rises. From A. B. Andrabi and A. T. Mallajosyula, Sol. Energy 264, 112020 (2023)."
  - src: "/assets/img/figures/dlts-memristor-ifetc2022.jpg"
    caption: "C–V, doping profile and DLTS of a flexible perovskite memristor, showing ionic defect levels. From H. J. Gogoi, A. B. Andrabi et al., IEEE IFETC (2022)."
  - src: "/assets/img/figures/peled-dlts-jpd2026.jpg"
    caption: "DLTS rate-window scan and Arrhenius plot of a deep trap in a perovskite LED. From A. Baruah and A. T. Mallajosyula, J. Phys. D 59, 015112 (2026)."
  - src: "/assets/img/figures/dgmosfet-structure-physscr2025.jpg"
    caption: "Double-gate MOSFET used for our compact model. From R. U. Ahmed and A. T. Mallajosyula, Phys. Scr. 100, 085414 (2025)."
  - src: "/assets/img/figures/dgmosfet-potential-physscr2025.jpg"
    caption: "Surface potential along the channel: model against TCAD simulation. From R. U. Ahmed and A. T. Mallajosyula, Phys. Scr. 100, 085414 (2025)."
---

Every perovskite device we make, whether a memory, a solar cell or an LED, is shaped by defects: deep and shallow traps, and ions that move. Measuring them is hard, because their signals overlap in ordinary electrical measurements. We develop methods that separate them, check those methods against device simulation, and say when each reading can be trusted.

### Our approach

For each device we make or simulate, we want to understand the physics underneath and turn it into analytical or semi-empirical models. We study generation and recombination, and both electronic and ionic charge transport, using nano-scale imaging, deep-level transient spectroscopy, impedance spectroscopy, and low-temperature I–V and C–V measurements. Device structures are simulated with Synopsys Sentaurus and Silvaco 2D/3D TCAD, Lumerical and MATLAB, to support the experiments and to build new models.

### What we have shown

- **Traps from an ordinary dark J–V curve.** Trapped charge near the injecting contact bends the bands. This shifts the voltage where current changes from diffusion to drift (the peak of d log J / d log V) to lower values. The shift tracks trap density and depth even with mobile ions present, and compares films better than V<sub>OC</sub>.
- **CEISIM, our own simulator.** CEISIM (Coupled Electronic–Ionic Transport Semiconductor Device Simulator) is a one-dimensional drift–diffusion simulator that treats trap occupancy and mobile ions as dynamical variables, with DC, small-signal and transient solvers in one framework. It lets us look inside the device during an impedance or transient measurement.
- **DLTS of ionic defects** in perovskite memristors (methylammonium vacancies, 0.48 eV) and LEDs (bromide-vacancy-related trap, 0.30 eV).
- **Compact models.** An analytical double-gate MOSFET model for potential, subthreshold and drain current, and a simulated pore-confined phase-change memory that uses current crowding to save energy.
