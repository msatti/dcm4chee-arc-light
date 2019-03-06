/*
 * **** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is part of dcm4che, an implementation of DICOM(TM) in
 * Java(TM), hosted at https://github.com/dcm4che.
 *
 * The Initial Developer of the Original Code is
 * J4Care.
 * Portions created by the Initial Developer are Copyright (C) 2015-2019
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * See @authors listed below
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * **** END LICENSE BLOCK *****
 *
 */

package org.dcm4chee.arc.qmgt.impl;

import org.dcm4che3.util.SafeClose;
import org.dcm4chee.arc.entity.QueueMessage;
import org.dcm4chee.arc.qmgt.QueueMessageQuery;
import org.hibernate.Session;
import org.hibernate.StatelessSession;
import org.hibernate.Transaction;
import org.hibernate.annotations.QueryHints;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Expression;
import javax.persistence.criteria.Order;
import javax.persistence.criteria.Root;
import java.util.Iterator;

/**
 * @author Vrinda Nayak <vrinda.nayak@j4care.com>
 * @since June 2018
 */

class QueueMessageQueryImpl implements QueueMessageQuery {
    private static final Logger LOG = LoggerFactory.getLogger(QueueMessageQueryImpl.class);
    private Transaction transaction;
    private final StatelessSession session;
    private final TypedQuery<QueueMessage> query;
    private Iterator<QueueMessage> iterate;
    private Root<QueueMessage> queueMsg;

    public QueueMessageQueryImpl(EntityManager em, Expression<Boolean> matchQueueMessage,
                                 Order order, int fetchSize, int offset, int limit) {
        this.session = openStatelessSession(em);
        CriteriaQuery<QueueMessage> query1 = em.getCriteriaBuilder().createQuery(QueueMessage.class)
                .where(matchQueueMessage);
        if (order != null)
            query1.orderBy(order);
        queueMsg = query1.from(QueueMessage.class);
        query1.select(queueMsg);
        query = em.createQuery(query1);
        if (limit > 0)
            query.setMaxResults(limit);
        if (offset > 0)
            query.setFirstResult(offset);
        query.setHint(QueryHints.FETCH_SIZE, fetchSize);
    }

    private StatelessSession openStatelessSession(EntityManager em) {
        return em.unwrap(Session.class).getSessionFactory().openStatelessSession();
    }

    @Override
    public void close() {
        if (transaction != null) {
            try {
                transaction.commit();
            } catch (Exception e) {
                LOG.warn("Failed to commit transaction:\n{}", e);
            }
        }
        SafeClose.close(session);
    }

    @Override
    public Iterator<QueueMessage> iterator() {
        transaction = session.beginTransaction();
        iterate = query.getResultList().iterator();
        return iterate;
    }
}
