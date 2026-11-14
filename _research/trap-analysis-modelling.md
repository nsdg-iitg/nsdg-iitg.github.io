---
title: "Defect spectroscopy and device modelling"
short: "Device physics"
order: 4
figure: model
lead: "Physics-based ways to find traps and mobile ions in perovskite devices from electrical measurements, our own device simulator, and compact models of transistors and memories."
people: [abdul-basit-andrabi, abinash-baruah, rekib-uddin-ahmed]
methods: "Sentaurus and Silvaco TCAD · in-house 1D drift–diffusion simulator · DLTS · impedance and capacitance spectroscopy · low-temperature I–V and C–V · MATLAB"
description: "Trap and mobile-ion characterisation, DLTS, drift–diffusion device simulation and compact modelling at the Nanoelectronics and Semiconductor Devices Group, IIT Guwahati."
---

Every perovskite device we make, whether a memory, a solar cell or an LED, is shaped by defects: deep and shallow traps, and ions that move. Measuring them is hard, because their signals overlap in ordinary electrical measurements. We develop methods that separate them, check those methods against device simulation, and say when each reading can be trusted.

### What we have shown

- **Traps from an ordinary dark J–V curve.** Trapped charge near the injecting contact bends the bands. This shifts the voltage where current changes from diffusion to drift (the peak of d log J / d log V) to lower values. The shift tracks trap density and depth even with mobile ions present, and compares films better than V<sub>OC</sub>.
- **An in-house simulator.** We have written a one-dimensional drift–diffusion simulator that treats trap occupancy and mobile ions as dynamical variables, with DC, small-signal and transient solvers in one framework. It lets us look inside the device during an impedance or transient measurement.
- **DLTS of ionic defects** in perovskite memristors (methylammonium vacancies, 0.48 eV) and LEDs (bromide-vacancy-related trap, 0.30 eV).
- **Compact models.** An analytical double-gate MOSFET model for potential, subthreshold and drain current, and a simulated pore-confined phase-change memory that uses current crowding to save energy.
