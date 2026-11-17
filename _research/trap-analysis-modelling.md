---
title: "Defect spectroscopy and device modelling"
short: "Device physics"
order: 5
figure: model
card_image: /assets/img/areas/trap-analysis-modelling.jpg
card_alt: "Energy-level diagram of the simulated ITO/PEDOT:PSS/MAPbI3/PCBM/Al perovskite solar cell (Sol. Energy 2023)"
card_plot: /assets/img/areas/plot-trap-analysis-modelling.jpg
card_plot_alt: "DLTS rate-window plot of a perovskite LED, showing the trap signature (J. Phys. D 2026)"
lead: "Physics-based methods to characterise traps and mobile ions in perovskite devices from electrical measurements, an in-house device simulator, and compact models of transistors and memories."
people: [abdul-basit-andrabi, abinash-baruah, rekib-uddin-ahmed]
methods: "Sentaurus and Silvaco TCAD · CEISIM (our in-house 1D drift–diffusion simulator) · DLTS · impedance and capacitance spectroscopy · low-temperature I–V and C–V · MATLAB"
description: "Trap and mobile-ion characterisation, DLTS, drift–diffusion device simulation and compact modelling at the Nanoelectronics and Semiconductor Devices Group, IIT Guwahati."
figures:
  - src: "/assets/img/figures/transition-voltage-solen2023.jpg"
    caption: "The transition voltage, at which the slope of log J against log V peaks and the current changes from diffusion-dominated to drift-dominated. From A. B. Andrabi and A. T. Mallajosyula, Sol. Energy 264, 112020 (2023)."
  - src: "/assets/img/figures/transition-voltage-traps-solen2023.jpg"
    caption: "TCAD simulation showing the shift and weakening of the transition peak with increasing trap density. From A. B. Andrabi and A. T. Mallajosyula, Sol. Energy 264, 112020 (2023)."
  - src: "/assets/img/figures/dlts-memristor-ifetc2022.jpg"
    caption: "C–V characteristics, doping profile and DLTS of a flexible perovskite memristor, showing ionic defect levels. From H. J. Gogoi, A. B. Andrabi et al., IEEE IFETC (2022)."
  - src: "/assets/img/figures/peled-dlts-jpd2026.jpg"
    caption: "DLTS rate-window scan and Arrhenius plot of a deep trap in a perovskite LED. From A. Baruah and A. T. Mallajosyula, J. Phys. D 59, 015112 (2026)."
  - src: "/assets/img/figures/dgmosfet-structure-physscr2025.jpg"
    caption: "Double-gate MOSFET structure used for the compact model. From R. U. Ahmed and A. T. Mallajosyula, Phys. Scr. 100, 085414 (2025)."
  - src: "/assets/img/figures/dgmosfet-potential-physscr2025.jpg"
    caption: "Surface potential along the channel from the model and from TCAD simulation. From R. U. Ahmed and A. T. Mallajosyula, Phys. Scr. 100, 085414 (2025)."
---

The behaviour of perovskite memories, solar cells and LEDs is strongly influenced by defects, namely deep and shallow traps and mobile ions. Their characterisation is difficult because their signatures overlap in conventional electrical measurements. We develop methods to distinguish these contributions, validate the methods against device simulation, and establish the conditions under which each interpretation is reliable.

### Approach

For each device that we fabricate or simulate, the aim is to understand the underlying physics and to express it in analytical or semi-empirical models. We study generation and recombination, and both electronic and ionic charge transport, using nano-scale imaging, deep-level transient spectroscopy, impedance spectroscopy, and low-temperature I–V and C–V measurements. Device structures are simulated with Synopsys Sentaurus and Silvaco 2D/3D TCAD, Lumerical and MATLAB, both to support the experiments and to develop new models.

### Key results

- **Trap characterisation from dark J–V characteristics.** Trapped charge near the injecting contact causes band bending, which shifts the diffusion-to-drift transition voltage (the peak of d log J / d log V) to lower values. In simulation, this shift follows the trap density and depth in the presence of mobile ions, and distinguishes films more reliably than V<sub>OC</sub>.
- **CEISIM, an in-house simulator.** CEISIM (Coupled Electronic–Ionic Transport Semiconductor Device Simulator) is a one-dimensional drift–diffusion simulator that treats trap occupancy and mobile ions as dynamical variables, with DC, small-signal and transient solvers in a single framework. It provides access to the internal state of the device during impedance and transient measurements.
- **DLTS of ionic defects** in perovskite memristors (methylammonium vacancies, 0.48 eV) and LEDs (a bromide-vacancy-related trap, 0.30 eV).
- **Compact models.** An analytical model of the double-gate MOSFET for the channel potential, subthreshold current and drain current, and a simulation study of a pore-confined phase-change memory that uses current crowding to reduce programming energy.
