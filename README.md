# KBC Life Moments

**KBC Life Moments turns everyday financial signals into timely, customer-confirmed moments of help.**

A major life event rarely appears as a single transaction. Moving house, having a child, starting a job or buying a car creates a **pattern of small changes** across a customer's financial life.

Today, these signals are largely handled independently by individual products and services. We envision a shared **Life Moments layer** that brings these signals together, identifies meaningful changes in a customer's situation, and gives KBC's ecosystem the context to respond.

## Why Life Moments?

KBC already has a unique view of its customers' financial lives: transactions, accounts, insurance, loans, investments and interactions with KBC services.

The opportunity is not to collect more data, but to **connect the data KBC already has**.

For example, a new rent payment alone does not mean someone moved. But a new rent payment combined with a stopped old rent payment, furniture purchases, changed utilities and an address update creates a much stronger signal.

Instead of reacting to individual transactions, Life Moments recognizes the **bigger change behind them**.

## From a signal to a moment

When a meaningful pattern is detected, KBC does not assume it knows what happened.

The customer is asked:

> **"Have you recently welcomed a baby into your family?"**

The customer can confirm, dismiss or ignore the suggestion. They can also see **why KBC asked**, keeping the experience transparent and giving the customer control.

Only after confirmation does the Life Moment become available to the relevant KBC services.

For example, confirming a new baby could unlock:

- a new savings account for the child
- family or life insurance updates
- relevant financial planning
- other services that become useful at this stage of life

The same principle can apply to moving house, buying a car, starting a job and many other moments.

## One Life Moment, many KBC services

Life Moments is intentionally an **intermediate layer**, not another product.

It creates a common language between the customer's situation and KBC's existing services.

Today, KBC Mobile already brings together banking, insurance and additional services, while products such as **MyHome** provide specialized experiences around housing. Kate can already guide customers towards KBC services and actions.

Life Moments extends this idea one step further:

> **Instead of waiting for the customer to search for a service, KBC can recognize when that service becomes relevant.**

A confirmed `NEW_BABY` moment, for example, could be consumed by savings, insurance and financial-planning services independently. A `MOVED_HOME` moment could be useful to MyHome, insurance, address management and mortgage services.

The Life Moment itself does not decide what product to sell. **Each KBC service decides how it can best help.**

## Privacy and non-intrusive

Life Moments is designed around a simple principle:

**KBC should not act on an assumption about a customer.**

The proof of concept uses only data that KBC could reasonably have about its customers. No external personal data is required.

When the system has enough evidence to suggest a possible life event, it asks the customer rather than silently acting on the inference.

The customer remains in control, while KBC can still turn its existing data into something genuinely useful.

We also deliberately focus on **meaningful life moments rather than every possible behavioural change**. This reduces notification fatigue, allows stronger signals to be combined, and gives each interaction a clear purpose.

## Our vision for KBC

We see Life Moments as a foundation for a more **context-aware KBC**.

Today, customers navigate between products and services. Tomorrow, KBC could organize the experience more naturally around what is happening in their lives.

A customer should not need to know whether they need MyHome, insurance, savings or another KBC service.

They should be able to say:

> **"Something important has changed in my life."**

And KBC should be able to help them understand what that means financially.

## Scaling beyond the proof of concept

Our prototype deliberately starts small: a few life moments, KBC-owned data and an explainable detection model.

The architecture can scale in three directions:

- **More signals:** richer use of KBC's existing transactions, products, interactions and customer feedback.
- **More life moments:** from moving house and having a baby to retirement, starting a business, marriage and other meaningful transitions.
- **More KBC services:** any KBC product or ecosystem service can subscribe to relevant Life Moments and decide how to respond.

Over time, confirmed customer responses also create a feedback loop: the system learns which signals genuinely correspond to life events and which suggestions customers dismiss.

External data could eventually improve detection where appropriate, but it should be introduced deliberately and only where the additional value justifies the privacy and governance implications.

**The long-term vision is not a bank that sells more products. It is a bank that understands when its existing services become useful and makes them available at key moments.**